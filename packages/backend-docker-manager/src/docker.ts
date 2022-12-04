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

export async function pullImage(workerImage: string): Promise<void> {
    await docker("pull", workerImage);
}

export async function startWorker(
    workerImage: string,
    workerName: string,
    workerEnv: Record<string, string>,
    fetchUrlWhenLoaded: string,
    maxMemoryInBytes: null | number,
): Promise<string> {
    const id = await docker(
        "run", "-d",
        "--name", workerName,
        "--network", `container:${MANAGER_ID}`,
        ...Object.entries(workerEnv).flatMap(([k, v]) => ["--env", `${k}=${v}`]),
        ...maxMemoryInBytes == null ? [] : ["--memory", `${maxMemoryInBytes}b`],
        "--env", `FETCH_URL_WHEN_LOADED=${fetchUrlWhenLoaded}`,
        ...(await getWorkerBinds()).flatMap(b => ["-v", b]),
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
    await stopWorker(workerName);
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

let workerBinds: string[];
export async function getWorkerBinds(): Promise<string[]> {
    if (workerBinds != null) {
        return workerBinds;
    }

    const result = await docker(
        "inspect",
        "-f", "{{json .HostConfig.Binds}}",
        MANAGER_ID,
    );
    const binds: string[] = JSON.parse(result);
    workerBinds = binds.filter(b => !b.includes("docker.sock"));

    return workerBinds;
}
