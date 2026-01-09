/**
 * Web-compatible replacement for expo-document-picker
 * Uses native HTML file input on web platform
 */

interface DocumentResult {
    type: 'success' | 'cancel';
    uri?: string;
    name?: string;
    size?: number;
    mimeType?: string;
}

interface PickerOptions {
    type?: string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
}

export async function getDocumentAsync(options?: PickerOptions): Promise<DocumentResult> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';

        // Convert MIME types to accept format
        if (options?.type && options.type.length > 0) {
            input.accept = options.type.join(',');
        }

        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                resolve({
                    type: 'success',
                    uri: URL.createObjectURL(file),
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                });
            } else {
                resolve({ type: 'cancel' });
            }
        };

        // Handle cancel (user closes file dialog without selecting)
        input.oncancel = () => {
            resolve({ type: 'cancel' });
        };

        input.click();
    });
}
