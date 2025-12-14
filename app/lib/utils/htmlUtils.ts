export class HtmlUtils {
  static stripHtml(html?: string): string {
    if (!html) return "";
    // remove style and script contents entirely
    let s = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    // normalize newlines
    s = s.replace(/\r\n|\r/g, "\n");
    // replace block tags with newline
    s = s.replace(/<\/(div|p|br|li|h[1-6]|tr|table|thead|tbody)>/gi, "\n");
    // remove remaining tags
    s = s.replace(/<[^>]+>/g, "");
    // unescape few entities
    s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
    // collapse multiple newlines
    s = s.replace(/\n\s*\n+/g, "\n\n");
    return s.trim();
  }
}
