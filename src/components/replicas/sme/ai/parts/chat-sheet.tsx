import { Bot, Send, Sparkles, WifiOff, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { R_CANVAS, RBottomSheet, RBubble, RGlyph, RIconChip } from '@/components/replicas/kit';
import { smeChat, type SmeChatMessage } from '@/components/replicas/sme/sample-data';

/** What the sheet holds: the suggestion chips, a grounded thread, or a question that needs a connection. */
export type ChatLook = 'thread' | 'empty' | 'offline';

/** AIChatSheet: 82% of the window (SHEET_HEIGHT_RATIO), rounded like the app. */
const SHEET_HEIGHT = Math.round(R_CANVAS.height * 0.82);

/** Sparkles tile, title over the grounding line, and the close glyph (16 × 12 padding, 1 px hairline below). */
function ChatHeader(): ReactNode {
  return (
    <span className="rx-sme-ai-chat-head">
      <span className="rx-sme-ai-chat-head__lead">
        <RIconChip icon={Sparkles} color="var(--rx-sme-ai-accent)" size={32} radius={10} shape="square" iconSize={16} />
        <span className="rx-sme-ai-chat-head__titles">
          <span className="rx-sme-ai-chat-head__title">{smeChat.title}</span>
          <span className="rx-sme-ai-chat-head__sub">{smeChat.subtitle}</span>
        </span>
      </span>
      <span className="rx-sme-ai-chat-head__close">
        <RGlyph icon={X} size={20} />
      </span>
    </span>
  );
}

/** The empty conversation: a 56 px Bot circle, the greeting and three suggestion chips. */
function ChatEmpty(): ReactNode {
  return (
    <span className="rx-sme-ai-chat-empty">
      <RIconChip icon={Bot} color="var(--rx-sme-ai-accent)" size={56} shape="circle" iconSize={26} />
      <span className="rx-sme-ai-chat-greet">{smeChat.greeting}</span>
      <span className="rx-sme-ai-chat-chips">
        {smeChat.suggestions.map((suggestion) => (
          <span key={suggestion} className="rx-sme-ai-chat-chip">
            {suggestion}
          </span>
        ))}
      </span>
    </span>
  );
}

/** A message bubble: the owner's on the right in solid blue, the assistant's on the left on the card fill. */
function Message({ message }: { readonly message: SmeChatMessage }): ReactNode {
  return (
    <RBubble from={message.from} className="rx-sme-ai-msg">
      {message.text}
    </RBubble>
  );
}

/** The failed answer: a pale-red bubble with WifiOff, the title and a 12 px explanation. */
function OfflineBubble(): ReactNode {
  return (
    <RBubble from="them" tone="error" className="rx-sme-ai-msg">
      <span className="rx-sme-ai-err">
        <span className="rx-sme-ai-err__head">
          <RGlyph icon={WifiOff} size={15} />
          <span>{smeChat.offline.title}</span>
        </span>
        <span className="rx-sme-ai-err__body">{smeChat.offline.body}</span>
      </span>
    </RBubble>
  );
}

/** The composer pinned to the bottom: the empty pill input and the grey send button (nothing typed). */
function Composer(): ReactNode {
  return (
    <span className="rx-sme-ai-composer">
      <span className="rx-sme-ai-composer__input">{smeChat.placeholder}</span>
      <span className="rx-sme-ai-composer__send">
        <RGlyph icon={Send} size={18} />
      </span>
    </span>
  );
}

/**
 * "Ask about your business" (AIChatSheet) over the hub: a 50% black scrim, then a sheet with
 * 20 px top corners and a 1 px border; header, conversation and composer. A long thread keeps its
 * newest message in view (the app scrolls to the end), so it is anchored to the bottom.
 */
export function ChatSheet({ look }: { readonly look: ChatLook }): ReactNode {
  return (
    <RBottomSheet
      height={SHEET_HEIGHT}
      radius={20}
      scrim="var(--rx-sme-ai-scrim)"
      bg="var(--rx-sme-ai-canvas)"
      className="rx-sme-ai-sheet"
      header={<ChatHeader />}
      footer={<Composer />}
    >
      <span className="rx-sme-ai-chat-body" data-look={look}>
        {look === 'empty' ? <ChatEmpty /> : null}
        {look === 'thread' ? smeChat.thread.map((message, index) => <Message key={index} message={message} />) : null}
        {look === 'offline' ? (
          <>
            <Message message={{ from: 'me', text: smeChat.offline.question }} />
            <OfflineBubble />
          </>
        ) : null}
      </span>
    </RBottomSheet>
  );
}
