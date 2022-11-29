import { execFile } from "node:child_process";
import { hostname } from "node:os";
import { promisify } from "node:util";

export const MANAGER_ID = hostname();

async function docker(...args: string[]): Promise<string> {
    const { stdout } = await promisify(execFile)("/usr/bin/docker", args, { encoding: "utf8" });
    return stdout;
}

export async function renameStartingContainer(workerName: string): Promise<void> {
    await docker("rename", `${workerName}-starting`, workerName);
}

export async function startWorker(
    workerImage: string,
    workerName: string,
    workerEnv: Record<string, string>,
    fetchUrlWhenLoaded: string,
): Promise<string> {
    const id = await docker(
        "run", "-d",
        "--name", `${workerName}-starting`,
        "--network", `container:${MANAGER_ID}`,
        ...Object.entries(workerEnv).flatMap(([k, v]) => ["--env", `${k}=${v}`]),
        "--env", `FETCH_URL_WHEN_LOADED=${fetchUrlWhenLoaded}`,
        "-v", await getEnvBind(),
        workerImage,
    );
    return id;
}

export async function stopWorker(workerName: string): Promise<boolean> {
    try {
        await docker("stop", workerName);
        return true;
    }
    catch (err) {
        // ignore missing container
        if (err instanceof Error && err.message.includes("No such container")) {
            return false;
        }
        throw err;
    }
}

export async function removeWorker(workerName: string): Promise<boolean> {
    try {
        await docker("rm", workerName);
        return true;
    }
    catch (err) {
        // ignore missing container
        if (err instanceof Error && err.message.includes("No such container")) {
            return false;
        }
        throw err;
    }
}

let getEnvBindCache: string | undefined;
export async function getEnvBind(): Promise<string> {
    if (getEnvBindCache != null) {
        return getEnvBindCache;
    }

    const result = await docker(
        "inspect",
        "-f", "{{json .HostConfig.Binds}}",
        MANAGER_ID,
    );

    const binds: string[] = JSON.parse(result);
    if (binds.length !== 2) {
        throw new Error("Expected two binds for the manager container, docker.sock and the env dir");
    }

    const [envBind] = binds
        .map(b => b.replace(/:ro$/, ""))
        .filter(b => !b.endsWith("docker.sock"));

    return getEnvBindCache = `${envBind}:ro`;
}
