import { Camera, CircleAlert, Image as ImageIcon, MapPin, Search, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  PendingReplica,
  RAutoScroll,
  RAvatar,
  RAvatarStack,
  RBarPairs,
  RBottomSheet,
  RBubble,
  RButton,
  RCallBackdrop,
  RField,
  RLineChart,
  RLoadingDots,
  RMapCanvas,
  RModalCard,
  RProgress,
  RRipple,
  RSearchField,
  RSegmentBar,
  RSpinner,
  RStack,
  RStateSequence,
  RStepper,
  RText,
  RToast,
  RTypewriter,
  RVTimeline,
  RWaveform,
  rBrand,
  rToken,
} from '@/components/replicas/kit';
import { Specimen } from './specimen';

/** Gallery part 2: fields, meters, people, chat, overlays, calls, motion (posters) and stubs. */
export function GalleryContent(): ReactNode {
  return (
    <>
      <Specimen name="RField" note="select (focused) · textarea · error">
        <RStack gap={14}>
          <RField kind="select" label="Case Type" required value="Vehicular Accident" focused />
          <RField kind="textarea" label="Description" placeholder="Describe what happened, when, and any other relevant details..." />
          <RField kind="input" label="Injury Status" required placeholder="Select an option" error="This field is required" />
        </RStack>
      </Specimen>
      <Specimen name="RSearchField · RStepper" note="POS search, cart steppers" app="sme">
        <RStack gap={12}>
          <RSearchField placeholder="Search products..." radius={16} bg="#f8f9fc" border="#e5e7eb" iconSize={16} />
          <RSearchField placeholder="Search products…" bg="#e5e7eb" radius="full" />
          <RStack dir="row" gap={12} align="center">
            <RStepper value={2} />
            <RStepper value={1} trashAtOne look="plain" color="#27ae60" />
          </RStack>
        </RStack>
      </Specimen>

      <Specimen name="RProgress · RSegmentBar" note="target · heat-index bands with marker">
        <RStack gap={14}>
          <RProgress value={72} color="#f59e0b" />
          <RProgress value={23} color="#6d28d9" h={6} />
          <RSegmentBar
            segments={[
              { flex: 5, color: '#ffff00' },
              { flex: 9, color: '#f1c232' },
              { flex: 10, color: '#ff6d01' },
              { flex: 9, color: '#ff0000' },
            ]}
            marker={{ at: 31, color: '#f1c232' }}
            ticks={['27°C', '33°C', '42°C', '52°C+']}
          />
        </RStack>
      </Specimen>
      <Specimen name="RVTimeline" note="done · active · pending" app="sme">
        <RVTimeline
          steps={[
            { label: 'Confirmed', state: 'done', meta: '11:42 AM' },
            { label: 'Preparing', state: 'done' },
            { label: 'Out for delivery', state: 'active' },
            { label: 'Completed', state: 'pending' },
          ]}
        />
      </Specimen>

      <Specimen name="RAvatar · RAvatarStack" note="monograms only, never photos" theme="dark" app="responder">
        <RStack dir="row" gap={16} align="center">
          <RAvatar initials="AS" size={64} color="#60a5fa" />
          <RAvatar initials="DR" size={40} bg={rBrand.primary} ring={false} textColor="#ffffff" />
          <RAvatarStack
            people={[
              { initials: 'AS', bg: '#1d4ed8' },
              { initials: 'RT', bg: '#0e7490' },
              { initials: 'MV', bg: '#b45309' },
              { initials: 'JL', bg: '#6d28d9' },
            ]}
            ring="#0a0b12"
            max={3}
          />
        </RStack>
      </Specimen>
      <Specimen name="RBubble · RWaveform" note="them · me voice note · urgent · mention" app="responder">
        <RStack gap={10}>
          <RBubble from="them" sender="Unit 2">
            All units, staging at the plaza (sample).
          </RBubble>
          <RBubble from="me" voice={{ seconds: 7, played: 3 }} transcript="Copy, ETA five minutes." lang="English" />
          <RBubble from="them" urgent>
            Road closed at Sample Bridge, reroute via the highway (sample).
          </RBubble>
          <RBubble from="them" mention>
            @You please confirm your unit.
          </RBubble>
          <RWaveform seed={11} played={0.5} color={rToken.ink3} playedColor={rBrand.primary} />
        </RStack>
      </Specimen>
      <Specimen name="RBubble" note="SME AI chat: user, assistant, offline" app="sme" theme="dark">
        <RStack gap={10}>
          <RBubble from="me">How were my sales this month?</RBubble>
          <RBubble from="them">This month you made ₱48,250 in revenue and ₱10,170 in net profit.</RBubble>
          <RBubble from="them" tone="error" icon={WifiOff}>
            AI needs a connection
          </RBubble>
        </RStack>
      </Specimen>

      <Specimen name="RBottomSheet" note="handle, header, pinned footer, scrim" height={300} pad={0} app="responder">
        <RBottomSheet
          height="80%"
          handle={{ color: '#085499' }}
          scrim
          bg="#f2f5f9"
          header={
            <RStack pad={[10, 16]} bg="#085499" gap={2}>
              <RText size={8} weight={500} upper tracking={1.2} color="rgb(255 255 255 / 0.4)">
                Active dispatch
              </RText>
              <RText size={16} weight={700} color="#ffffff">
                NEW EMERGENCY
              </RText>
            </RStack>
          }
          footer={
            <RStack dir="row" gap={10} pad={12} bg="#ffffff">
              <RButton look="outline" label="DECLINE" color="#ef4444" h={44} radius={14} fontSize={13} style={{ flex: 1 }} />
              <RButton look="solid" label="ACCEPT" color="#085499" h={44} radius={14} fontSize={13} style={{ flex: 1 }} />
            </RStack>
          }
        >
          <RStack pad={12}>
            <RText size={13} color={rToken.ink2}>
              Kitchen fire, residents evacuated (sample).
            </RText>
          </RStack>
        </RBottomSheet>
      </Specimen>
      <Specimen name="RModalCard · RToast" note="SOS confirmation, top toast" height={300} pad={0}>
        <RToast text="New ticket assigned — opening the map." icon={CircleAlert} top={10} />
        <RModalCard scrim="rgb(55 65 81 / 0.55)" pad={20} width="88%">
          <RStack gap={10}>
            <RText size={17.5} weight={700}>
              Emergency Call
            </RText>
            <RText size={12.25} color={rToken.ink3}>
              Auto-confirming in 5s
            </RText>
            <RProgress value={60} color="#ec4899" track="#e5e7eb" h={7} />
            <RStack dir="row" gap={8}>
              <RButton look="solid" label="Cancel" color="#f3f4f6" textColor="#111827" h={42} fontSize={14} style={{ flex: 1 }} />
              <RButton look="danger" label="Confirm Call" h={42} fontSize={14} style={{ flex: 1 }} />
            </RStack>
          </RStack>
        </RModalCard>
      </Specimen>
      <Specimen name="RCallBackdrop" note="citizen + blurred silhouette · responder + orbs" theme="dark" height={220} pad={0}>
        <RStack dir="row" style={{ height: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <RCallBackdrop palette="citizen" silhouette />
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <RCallBackdrop palette="responder" orbs="#60a5fa" />
          </div>
        </RStack>
      </Specimen>

      <Specimen name="RStateSequence" note="static: shows posterFrame (here frame 2)">
        <RStateSequence
          posterFrame={2}
          frames={[
            { atMs: 0, node: <RText size={14}>Frame 0 · In queue</RText> },
            { atMs: 1200, node: <RText size={14}>Frame 1 · Calling</RText> },
            { atMs: 2400, node: <RText size={14} weight={700}>Frame 2 · Connected (poster)</RText> },
          ]}
        />
      </Specimen>
      <Specimen name="RTypewriter · RAutoScroll" note="static: full text, unscrolled" app="sme">
        <RStack gap={10}>
          <RText size={14} lh={22}>
            <RTypewriter text="The phone does the math; the model writes the words." startMs={300} />
          </RText>
          <RAutoScroll distance={40} startMs={0} durationMs={1200} style={{ height: 44 }}>
            <RStack gap={4}>
              <RText size={13}>Row one</RText>
              <RText size={13}>Row two</RText>
              <RText size={13}>Row three (below the fold)</RText>
            </RStack>
          </RAutoScroll>
        </RStack>
      </Specimen>
      <Specimen name="RSpinner · RRipple · RLoadingDots" note="at rest until active" theme="dark" height={110}>
        <RStack dir="row" gap={28} align="center" justify="center" style={{ height: '100%', color: '#ffffff' }}>
          <RSpinner size={22} />
          <span style={{ position: 'relative', display: 'flex' }}>
            <RRipple size={44} />
            <RAvatar initials="07" size={44} color="#ffffff" />
          </span>
          <RLoadingDots size={6} />
        </RStack>
      </Specimen>

      <Specimen name="RMapCanvas (W6 stub)" note="pins, route, puck land in wave 2a">
        <RMapCanvas theme="light" height={120} pins={[{ x: 120, y: 300, kind: 'hazard', label: 'Flood' }]} />
      </Specimen>
      <Specimen name="RLineChart · RBarPairs (W6 stubs)" app="sme" theme="dark">
        <RStack gap={10}>
          <RLineChart
            history={[1400, 1650, 1800, 2100]}
            projected={[1900, 2000]}
            color="#4f9eff"
            projColor="rgb(79 158 255 / 0.55)"
            height={90}
            yLabels={['₱2,100', '₱1,400']}
            xLabels={['1', '6', '+1', '+7']}
          />
          <RBarPairs pairs={[[48, 28], [52, 30]]} colors={['#27ae60', '#ff5c55']} height={60} />
        </RStack>
      </Specimen>
      <Specimen name="PendingReplica" note="registry stand-in (state shown)" height={300} pad={0} app="responder">
        <PendingReplica state="online" />
      </Specimen>
      <Specimen name="RField icons" note="leading glyphs, photo tiles">
        <RStack dir="row" gap={12}>
          <RField kind="input" placeholder="Pick Photo" icon={ImageIcon} minHeight={60} style={{ flex: 1 }} />
          <RField kind="input" placeholder="Take Photo" icon={Camera} minHeight={60} style={{ flex: 1 }} />
        </RStack>
        <RStack dir="row" gap={6} align="center" style={{ marginTop: 10 }}>
          <MapPin size={14} color="#d84343" />
          <RText size={12.25} color={rToken.ink3}>
            Lot 1, Sample Road, Brgy. Example, Sample City
          </RText>
          <Search size={14} color={rToken.ink3} />
        </RStack>
      </Specimen>
    </>
  );
}
