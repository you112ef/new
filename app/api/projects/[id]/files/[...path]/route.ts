// app/api/projects/[id]/files/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Docker from 'dockerode';
import path from 'path';

const docker = new Docker();

// Correct type signature for the route context
type RouteParams = {
  params: {
    id: string; // Container ID
    path: string[]; // Catch-all segments for the file path
  };
};

// Helper function to execute a command in a container and get the output
async function execInContainer(containerId: string, cmd: string[], input?: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: !!input, // Attach stdin only if input is provided
      Tty: false,
    });

    const stream = await exec.start({ hijack: true, stdin: !!input });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      if (input) {
        stream.end(input);
      }

      container.modem.demuxStream(stream, { write: (data) => stdout += data.toString('utf8') }, { write: (data) => stderr += data.toString('utf8') });

      stream.on('end', () => resolve({ stdout, stderr }));
      stream.on('error', reject);
    });
  } catch (error) {
    if (error.statusCode === 404) {
      throw new Error(`Container not found: ${containerId}`);
    }
    throw error;
  }
}

// GET: Read file content or list directory contents
export async function GET(_req: NextRequest, context: RouteParams) {
  const { id, path: filePathArr = [] } = context.params;
  const targetPath = path.join('/app', ...filePathArr.map(decodeURIComponent));

  try {
    // Determine if the path is a file or a directory
    const { stdout: statOutput, stderr: statErr } = await execInContainer(id, ['stat', '-c', '%F', targetPath]);
    if (statErr) {
       // Handle cases where the file doesn't exist
      if (statErr.includes('No such file or directory')) {
        return NextResponse.json({ error: 'File or directory not found' }, { status: 404 });
      }
      throw new Error(statErr);
    }

    const fileType = statOutput.trim();

    if (fileType === 'directory') {
      const { stdout, stderr } = await execInContainer(id, ['ls', '-p', '--group-directories-first', targetPath]);
       if (stderr) throw new Error(stderr);
       const files = stdout.split('\n').filter(Boolean).map(name => ({
        name,
        isDirectory: name.endsWith('/'),
      }));
       return NextResponse.json({ files });
    } else {
      const { stdout, stderr } = await execInContainer(id, ['cat', targetPath]);
       if (stderr) throw new Error(stderr);
       return NextResponse.json({ content: stdout });
    }
  } catch (err) {
    console.error("GET Error:", err.message);
    return NextResponse.json({ error: "Internal error while reading file", details: err.message }, { status: 500 });
  }
}

// PUT: Write or create a file
export async function PUT(req: NextRequest, context: RouteParams) {
  const { id, path: filePathArr } = context.params;
  if (!filePathArr || filePathArr.length === 0) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const targetPath = path.join('/app', ...filePathArr.map(decodeURIComponent));

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content } = body as { content?: string };
  if (typeof content !== "string") {
    return NextResponse.json({ error: "Field 'content' must be a string" }, { status: 400 });
  }

  try {
    // Create the directory first to avoid errors
    const dirname = path.dirname(targetPath);
    await execInContainer(id, ['mkdir', '-p', dirname]);

    // Now write the file
    const { stderr } = await execInContainer(id, ['tee', targetPath], content);
    if (stderr) throw new Error(stderr);

    return NextResponse.json({ status: "updated", path: targetPath });
  } catch (err) {
    console.error("PUT Error:", err.message);
    return NextResponse.json({ error: "Internal error while writing file", details: err.message }, { status: 500 });
  }
}
