import { NextRequest, NextResponse } from 'next/server';
import Docker from 'dockerode';

const docker = new Docker();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const container = docker.getContainer(id);

    // First, run `npm install`
    const npmInstallExec = await container.exec({
      Cmd: ['npm', 'install'],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });
    const npmInstallStream = await npmInstallExec.start({ hijack: true, stdin: false });
    // We need to wait for npm install to finish
    await new Promise((resolve) => npmInstallStream.on('end', resolve));


    // Then, run `npm run dev` in the background
    const npmRunDevExec = await container.exec({
      Cmd: ['npm', 'run', 'dev'],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });
    await npmRunDevExec.start({ detach: true, Tty: false });

    return NextResponse.json({ message: 'Development server is starting.' });

  } catch (error) {
    console.error('Failed to start dev server:', error);
    return NextResponse.json({ error: error.message || 'Failed to start dev server.' }, { status: 500 });
  }
}
