const { execSync: execSync_ } = require("node:child_process");
const { createWriteStream } = require("node:fs");

/**
 * Execute a command and return the output.
 * @param {string} command
 */
function execSync(command) {
    return execSync_(command, { encoding: "utf8" });
}

/**
 * Parse CLI args and GitHub environment variables and run the script.
 */
function cli() {
    const { GITHUB_API_URL, GITHUB_OUTPUT, GITHUB_REPOSITORY } = process.env;
    if (!GITHUB_API_URL || !GITHUB_OUTPUT || !GITHUB_REPOSITORY) {
        console.error("Missing GitHub environment variables");
        process.exit(1);
    }

    const [githubToken, launcherYaml, ...subworkflowJobAndProjectNamesStr] = process.argv.slice(2);
    if (!githubToken || !launcherYaml || !subworkflowJobAndProjectNamesStr.length) {
        console.error("Usage: node getLastSuccessfulRun.js <githubToken> <githubRepository> <launcherYaml> <subworkflowJobAndProjectNames, ...>");
        process.exit(1);
    }

    const subworkflowJobAndProjectNames = Object.fromEntries(subworkflowJobAndProjectNamesStr.map(s => s.split(":")));

    main({
        githubToken,
        githubApiUrl: GITHUB_API_URL,
        githubOutput: GITHUB_OUTPUT,
        githubRepository: GITHUB_REPOSITORY,
        launcherYaml,
        subworkflowJobAndProjectNames,
    });
}

/**
 * Find the last successful run of each sub-workflow job and check if the project is affected.
 * @param {{
 *   githubApiUrl: string,
 *   githubOutput: string,
 *   githubRepository: string,
 *   githubToken: string,
 *   launcherYaml: string,
 *   subworkflowJobAndProjectNames: Record<string, string>,
 * }} options 
 */
async function main({
    githubApiUrl,
    githubOutput,
    githubRepository,
    githubToken,
    launcherYaml,
    subworkflowJobAndProjectNames,
}) {
    const lastSuccessfulShas = await findLastSuccessfulShas({
        githubToken,
        githubApiUrl,
        githubRepository,
        launcherYaml,
        subworkflowJobNames: Object.keys(subworkflowJobAndProjectNames),
    });
    console.log("Last successful SHAs:", lastSuccessfulShas);

    /** @type {Record<string, "" | "1">} */
    const affected = {};
    for (const [jobName, sha] of Object.entries(lastSuccessfulShas)) {
        if (sha) {
            // Check if the project is affected.
            const projectName = subworkflowJobAndProjectNames[jobName];
            const affectedProjects = nxPrintAffected(sha);
            affected[jobName] = affectedProjects.includes(projectName) ? "1" : "";
        }
        else {
            // Default to true if we can't find the last successful run.
            affected[jobName] = "1";
        }
    }

    writeGitHubOutput(githubOutput, affected);
}

/**
 * Loop through the launcher's workflow runs and find the last time each sub-workflow job succeeded.
 * @param {{
 *   githubToken: string,
 *   githubApiUrl: string,
 *   githubRepository: string,
 *   launcherYaml: string,
 *   subworkflowJobNames: string[],
 * }} options
 */
async function findLastSuccessfulShas({
   githubToken,
   githubApiUrl,
   githubRepository,
   launcherYaml,
   subworkflowJobNames,
}) {
   /** @type {Record<string, string | null>} */
   const results = Object.fromEntries(subworkflowJobNames.map(name => [name, null]));
   let remaining = subworkflowJobNames.length;

   const launcherWorkflowRuns = await queryApi(githubToken, `${githubApiUrl}/repos/${githubRepository}/actions/workflows/${launcherYaml}/runs`);

   // Loop through the workflow runs and find the last time each job succeeded.
   for (const workflowRun of launcherWorkflowRuns.workflow_runs) {
       const workflowJobs = await queryApi(githubToken, workflowRun.jobs_url);

       for (const workflowJob of workflowJobs.jobs) {
           // Check if the job succeeded and is one of the jobs we're looking for.
           const baseName = workflowJob.name.split(" / ")[0];
           if (results[baseName] === null && workflowJob.conclusion === "success") {
               remaining--;
               results[baseName] = workflowJob.head_sha;
           }
       }

       // Stop querying if we have all the results.
       if (remaining === 0) {
           break;
       }
   }

   return results;
}

/**
 * Returns a function to query the GitHub API and return the JSON response.
 * @param {string} githubToken
 * @returns {Promise<Record<string, any>>}
 */
async function queryApi(githubToken, url) {
    const res = await fetch(url, {
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });
    if (!res.ok) {
        throw new Error(`Failed to query ${url}: ${res.status} ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Write the results to GitHub output.
 * @param {string} githubOutput
 * @param {Record<string, string>} results
 */
function writeGitHubOutput(githubOutput, results) {
    console.log("Writing GitHub output:", results);

    const stream = createWriteStream(githubOutput, { flags: "a" });
    for (const [key, value] of Object.entries(results)) {
        stream.write(`${key}=${value ?? ""}\n`);
    };
    stream.end();
}

/**
 * Get the list of affected projects from Nx.
 * @param {string} baseSha
 * @returns {string[]} Affected projects
 */
function nxPrintAffected(baseSha) {
    if (nxPrintAffectedCache[baseSha]) {
        return nxPrintAffectedCache[baseSha];
    }

    const result = () => {
        console.log("Finding affected projects at commit:", baseSha);
        const stdout = execSync(`npx nx show projects --affected --base=${baseSha} --json`);
        return nxPrintAffectedCache[baseSha] = JSON.parse(stdout);
    }

    try {
        gitFetchSha(baseSha);
        return result();
    }
    catch (err) {
        if (err instanceof Error && (err.message.includes("No such ref") || err.message.includes("error processing shallow info: 4"))) {
            // If the base SHA is not found, try again after unshallowing.
            gitUnshallow();
            return result();
        }
        throw err;
    }
}
const nxPrintAffectedCache = {};

/**
 * Fetch the given SHA from the GitHub repository.
 * @param {string} sha
 */
function gitFetchSha(sha) {
    console.log("Fetching since commit:", sha);
    execSync(`git fetch origin ${sha}`);

    const shaUnixTimeStr = execSync(`git show -s --format=%ct ${sha}`);
    const shallowSince = Number.parseInt(shaUnixTimeStr, 10) - 1;
    execSync(`git fetch --update-shallow --shallow-since=${shallowSince} origin`);
}

/**
 * Fetch all history for the given branch.
 */
function gitUnshallow() {
    console.log("Unshallowing repository");
    execSync(`git fetch --unshallow`);
}

cli();
