import { Bell, EllipsisVertical, Radio, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { RAppBar, rBrand, RGlyph } from '@/components/replicas/kit';
import { responderChannel } from '@/components/replicas/responder/sample-data';
import { CHANNEL } from './palette';

/** The 44px header targets: mute bell, the ⋮ menu, and the live-call chip before the video glyph. */
function ChannelActions(): ReactNode {
  return (
    <span className="rx-responder-chanhead__actions">
      <span className="rx-responder-chanhead__target">
        <RGlyph icon={Bell} size={22} />
      </span>
      <span className="rx-responder-chanhead__target">
        <RGlyph icon={EllipsisVertical} size={22} />
      </span>
      <span className="rx-responder-chanhead__call">
        <span className="rx-responder-chanhead__live" style={{ color: CHANNEL.live }}>
          <RGlyph icon={Radio} size={13} />
          <span>{responderChannel.onCall}</span>
        </span>
        <RGlyph icon={Video} size={22} />
      </span>
    </span>
  );
}

/**
 * The thread header on the page colour, no shadow: the back glyph and the actions in the brand
 * accent, the channel name 17px SemiBold #0f172a, and a hairline under it.
 */
export function ChannelHeader(): ReactNode {
  return (
    <RAppBar
      look="responder"
      title={responderChannel.name}
      leading="back"
      bg="#f2f5f9"
      titleColor="#0f172a"
      titleSize={17}
      iconColor={rBrand.primary}
      className="rx-responder-chanhead"
      trailing={<ChannelActions />}
    />
  );
}
