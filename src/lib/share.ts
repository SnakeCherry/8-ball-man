/** Share some text through the phone/laptop share sheet if there is one, otherwise copy it. */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    // the share sheet was dismissed or the clipboard is blocked
    return 'failed'
  }
}
