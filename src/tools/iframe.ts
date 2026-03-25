import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BrowserManager } from '../browser-manager.js';
import { wrapError } from '../errors.js';

export function registerIframeTools(server: McpServer, bm: BrowserManager) {
  server.tool(
    'pilot_frames',
    'List all frames (iframes) on the page. Use pilot_frame_select to switch context into an iframe for snapshot/interaction.',
    {},
    async () => {
      await bm.ensureBrowser();
      try {
        const frames = await bm.listFrames();
        if (frames.length <= 1) {
          return { content: [{ type: 'text' as const, text: '(no iframes — only the main frame)' }] };
        }
        const activeFrame = bm.getActiveFrame();
        const page = bm.getPage();
        const allFrames = page.frames();
        const text = frames.map(f => {
          const isCurrent = allFrames[f.index] === activeFrame;
          const marker = isCurrent ? '→ ' : '  ';
          const label = f.isMain ? '[main]' : `[iframe${f.name ? ` name="${f.name}"` : ''}]`;
          return `${marker}[${f.index}] ${label} ${f.url}`;
        }).join('\n');
        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: wrapError(err) }], isError: true };
      }
    }
  );

  server.tool(
    'pilot_frame_select',
    'Switch context to an iframe by index or name. After switching, pilot_snapshot/click/fill will operate inside that iframe. Use pilot_frames to list available frames.',
    {
      index: z.number().optional().describe('Frame index from pilot_frames output'),
      name: z.string().optional().describe('Frame name attribute'),
    },
    async ({ index, name }) => {
      await bm.ensureBrowser();
      try {
        if (index !== undefined) {
          const frame = bm.selectFrameByIndex(index);
          return { content: [{ type: 'text' as const, text: `Switched to frame ${index} (${frame.url()}). Refs cleared — run pilot_snapshot for fresh refs.` }] };
        }
        if (name) {
          const frame = bm.selectFrameByName(name);
          return { content: [{ type: 'text' as const, text: `Switched to frame "${name}" (${frame.url()}). Refs cleared — run pilot_snapshot for fresh refs.` }] };
        }
        return { content: [{ type: 'text' as const, text: 'Provide index or name. Use pilot_frames to list available frames.' }], isError: true };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: wrapError(err) }], isError: true };
      }
    }
  );

  server.tool(
    'pilot_frame_reset',
    'Switch back to the main frame. Use after interacting with an iframe.',
    {},
    async () => {
      await bm.ensureBrowser();
      bm.resetFrame();
      return { content: [{ type: 'text' as const, text: 'Switched to main frame. Refs cleared — run pilot_snapshot for fresh refs.' }] };
    }
  );
}
