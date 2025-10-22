import { NextResponse } from 'next-server';
import Docker from 'dockerode';
import path from 'path';
import fs from 'fs/promises';
import { Writable } from 'stream';

const docker = new Docker();
const projectsBaseDir = path.join(process.cwd(), 'projects');
const logDir = path.join(process.cwd(), 'logs');

// A map from our framework names to the templates bun create expects.
const frameworkToTemplateMap: Record<string, string> = {
  'nextjs': 'next',
  'react': 'react',
  'vite': 'vite',
  'vue': 'vue',
  'svelte': 'svelte',
  'angular': 'angular', // Note: Bun's Angular template might be community-maintained
};

export async function POST(req: Request) {
  let logStream: Writable | null = null;
  try {
    await fs.mkdir(logDir, { recursive: true });
    const { name, framework } = await req.json();

    const logFile = path.join(logDir, `${name}-create.log`);
    await fs.appendFile(logFile, 'Request received\n');

    await docker.ping();
    await fs.appendFile(logFile, 'Docker daemon is reachable\n');


    logStream = new Writable({
      write(chunk, encoding, callback) {
        fs.appendFile(logFile, chunk.toString()).then(() => callback()).catch(callback);
      }
    });

    if (!name || !framework || !frameworkToTemplateMap[framework]) {
      await fs.appendFile(logFile, 'Invalid request body\n');
      return NextResponse.json({ error: 'Project name and a valid framework are required.' }, { status: 400 });
    }

    const template = frameworkToTemplateMap[framework];
    const imageName = 'oven/bun:latest'; // Using pre-pulled image

    const projectDirOnHost = path.join(projectsBaseDir, name);
    await fs.appendFile(logFile, `Creating host directory at ${projectDirOnHost}\n`);
    await fs.mkdir(projectDirOnHost, { recursive: true });

    await fs.appendFile(logFile, 'Creating container\n');
    const container = await docker.createContainer({
      Image: imageName,
      WorkingDir: '/app',
      Cmd: ['tail', '-f', '/dev/null'], // Keep container running
      HostConfig: {
        Binds: [`${projectDirOnHost}:/app`],
      },
      Tty: true, // Required for interactive commands
    });

    await fs.appendFile(logFile, 'Starting container\n');
    await container.start();

    await fs.appendFile(logFile, 'Executing bun create\n');
    const exec = await container.exec({
      Cmd: ['bun', 'create', template, '.', '--no-git'], // Scaffold in the current dir
      AttachStdout: true,
      AttachStderr: true,
    });

    const execStream = await exec.start({ hijack: true, stdin: false });
    container.modem.demuxStream(execStream, logStream, logStream);

    await new Promise(resolve => execStream.on('end', resolve));
    await fs.appendFile(logFile, 'bun create finished\n');

    return NextResponse.json({
      project_id: container.id, // The container ID is now our project ID
      container_id: container.id,
      dev_server_url: null, // Dev server is not started yet
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error.message || 'An internal server error occurred.';
    const logFile = path.join(logDir, `error.log`);
    await fs.appendFile(logFile, `${new Date().toISOString()} - ${errorMessage}\n`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    logStream?.end();
  }
}
