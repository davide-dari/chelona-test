/**
 * Utility to load external scripts asychronously.
 */
export async function loadExternalScript(url: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already exists, don't load again
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.id = id;
    script.async = true;

    script.onload = () => {
      console.log(`[ScriptLoader] Loaded: ${url}`);
      resolve();
    };

    script.onerror = (err) => {
      console.error(`[ScriptLoader] Error loading ${url}:`, err);
      reject(new Error(`Failed to load script: ${url}`));
    };

    document.head.appendChild(script);
  });
}
