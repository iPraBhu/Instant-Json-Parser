export async function readTextSafe() {
  if (navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      return { ok: true, text };
    } catch (error) {
      return { ok: false, error };
    }
  }
  return { ok: false, error: new Error('Clipboard API unavailable') };
}

export async function writeTextSafe(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return { ok: succeeded };
  } catch (error) {
    return { ok: false, error };
  }
}
