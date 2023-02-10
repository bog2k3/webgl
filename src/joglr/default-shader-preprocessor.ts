import { Shaders } from "./shaders";

function computePath(relativePath: string, fullReferrerPath: string): string {
	const pathFragmentEnd: number = fullReferrerPath.lastIndexOf("/");
	return fullReferrerPath.substring(0, pathFragmentEnd + 1) + relativePath;
}

function isWhiteSpace(c: string): boolean {
	return c == ' ' || c == '\t';
}

function nextNewLine(code: string, start: number): number {
	const retPos = code.indexOf("\r", start);
	const lnPos = code.indexOf("\n", start);
	if (retPos === -1) {
		if (lnPos === -1) {
			// no more new lines
			return code.length;
		} else {
			return lnPos;
		}
	} else if (lnPos === -1) {
		return retPos;
	} else {
		return Math.min(retPos, lnPos);
	}
}

export async function defaultShaderPreprocessor(code: string, originalPath: string): Promise<string> {
	let lastWrittenPos = 0;
	let linePointer = 0;
	const directiveToken = "#include ";
	let buffer = "";
	do {
		// find next directive:
		linePointer = code.indexOf(directiveToken, lastWrittenPos);
		if (linePointer === -1) {
			buffer += code.substring(lastWrittenPos);
			break;
		}
		// take out the whitespace before the directive:
		while (linePointer > 0 && isWhiteSpace(code[linePointer-1])) {
			linePointer--;
		}
		// write everything up to the directive
		buffer += code.substring(lastWrittenPos, linePointer);
		lastWrittenPos = linePointer;

		if (linePointer > 1 && code[linePointer-1] == '/' && code[linePointer-2] == '/') {
			// this #include is commented out, ignore it
			lastWrittenPos = nextNewLine(code, linePointer);
			continue;
		}

		if (linePointer < code.length) {
			// replace the directive with the contents of the referred file
			let directiveEnd: number = nextNewLine(code, linePointer);
			if (directiveEnd == -1) {
				directiveEnd = code.length;
			}
			const filenameStart: number = linePointer + directiveToken.length;
			const relativePath: string = code.substring(filenameStart, directiveEnd);
			// this will call preprocessor recursively:
			buffer += await Shaders.loadShaderFile(computePath(relativePath, originalPath));

			lastWrittenPos = directiveEnd;
		}
	} while (lastWrittenPos != -1);
	return buffer;
}