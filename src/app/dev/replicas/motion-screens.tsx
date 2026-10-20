import { CircleCheck, Clock, Mic, Phone, PhoneCall, PhoneOff, RefreshCw, ShoppingBag, Sparkles, SwitchCamera, TrendingUp, Volume2, Package, Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  RAppBar,
  RAutoScroll,
  RButton,
  RCallBackdrop,
  RCard,
  RGlassButton,
  RKpiTile,
  RLoadingDots,
  RPill,
  RProgress,
  RSegmented,
  RSpinner,
  RStack,
  RStateSequence,
  RText,
  RTypewriter,
  RVTimeline,
  R_CANVAS,
  rBrand,
  rToken,
} from '@/components/replicas/kit';

const CONNECTED_AT = 3200;

/**
 * A Citizen-style call screen (dark): a status pill and queue card that step through
 * RStateSequence (poster: connected), ripple rings, bouncing dots and a typed reassurance line.
 * Kit parts only; fictional data.
 */
export function MotionCallScreen(): ReactNode {
  return (
    <>
      <RCallBackdrop palette="citizen" silhouette />
      <RStack align="center" gap={18} pad={[86, 21, 0]} style={{ position: 'relative' }}>
        <RStateSequence
          posterFrame={2}
          frames={[
            {
              atMs: 0,
              node: (
                <RStack dir="row" align="center" gap={8}>
                  <RPill fill="glass" size="md" icon={Clock} label="In queue" textColor="#10b981" />
                  <RLoadingDots color="#ffffff" />
                </RStack>
              ),
            },
            { atMs: 1600, node: <RPill fill="glass" size="md" icon={PhoneCall} label="Calling Dispatcher 07" textColor="#d8f9ff" /> },
            {
              atMs: CONNECTED_AT,
              node: <RPill fill="glass" size="md" icon={CircleCheck} label="Connected to Dispatcher 07" textColor="#10b981" />,
            },
          ]}
        />
        <RCard radius={14} pad={[14, 21]} bg="rgb(255 255 255 / 0.1)" style={{ alignSelf: 'stretch' }}>
          <RStack align="center" gap={4}>
            <RText size={21} weight={700} color="#ffffff">
              Command Center Agent
            </RText>
            <RStateSequence
              posterFrame={1}
              frames={[
                {
                  atMs: 0,
                  node: (
                    <RText size={15.75} weight={700} color="#ffffff" align="center">
                      You are now #2 in queue
                    </RText>
                  ),
                },
                {
                  atMs: CONNECTED_AT,
                  node: (
                    <RText size={12.25} color="rgb(255 255 255 / 0.7)" align="center">
                      Dispatcher 07
                    </RText>
                  ),
                },
              ]}
            />
          </RStack>
        </RCard>
        <RGlassButton icon={Phone} size={70} ripple={{ count: 3, periodMs: 2000 }} style={{ marginTop: 48 }} />
        <RCard radius={14} pad={[12, 16]} bg="rgb(255 255 255 / 0.08)" style={{ alignSelf: 'stretch', marginTop: 48 }}>
          <RText size={13} lh={20} color="rgb(255 255 255 / 0.85)">
            <RTypewriter text="Stay on the line. Your location was shared with the command center." startMs={600} msPerChar={28} />
          </RText>
        </RCard>
      </RStack>
      <RStack dir="row" justify="around" pad={[0, 21]} style={{ position: 'absolute', left: 0, right: 0, bottom: 64 }}>
        <RGlassButton icon={Mic} size={56} />
        <RGlassButton icon={Volume2} size={56} iconColor="#3b82f6" />
        <RGlassButton icon={SwitchCamera} size={56} iconColor="#8b5cf6" />
        <RGlassButton icon={PhoneOff} size={56} tone="tint" />
      </RStack>
    </>
  );
}

/**
 * An SME-style dashboard (light): RAutoScroll scrolls the KPI grid to the timeline, a LIVE pill
 * pulses, a spinner turns, a button steps idle → loading → success and an AI line types out.
 * Kit parts only; fictional data.
 */
export function MotionDashboardScreen(): ReactNode {
  const bodyHeight = R_CANVAS.height - 100;
  return (
    <>
      <RAppBar look="sme" title="Dashboard" badge={3} />
      <RAutoScroll distance={320} startMs={800} durationMs={1600} style={{ height: bodyHeight }}>
        <RStack gap={12} pad={16}>
          <RStack dir="row" align="center" justify="between">
            <RText size={18} weight={700}>
              Good morning!
            </RText>
            <RStack dir="row" align="center" gap={8}>
              <RPill label="Live" color="#27ae60" dot="pulse" upper size="xs" />
              <RSpinner size={16} color={rBrand.primary} />
              <RefreshCw size={18} color={rBrand.primary} />
            </RStack>
          </RStack>
          <RSegmented look="pills" options={['Day', 'Week', 'Month', 'Year']} active={2} />
          <RStack dir="row" gap={12}>
            <RKpiTile look="kpi" icon={TrendingUp} label="Gross Income" value="₱48,250.00" accent="#27ae60" style={{ flex: 1 }} />
            <RKpiTile look="kpi" icon={ShoppingBag} label="Products Sold" value="1,284" accent="#1e4d8c" style={{ flex: 1 }} />
          </RStack>
          <RStack dir="row" gap={12}>
            <RKpiTile look="kpi" icon={TrendingUp} label="Gross Profit" value="₱19,870.00" accent="#27ae60" style={{ flex: 1 }} />
            <RKpiTile look="kpi" icon={Package} label="COGS" value="₱28,380.00" accent="#ff5c55" style={{ flex: 1 }} />
          </RStack>
          <RCard radius={12} border="default" shadow="sm" pad={14} edge={{ side: 'top', color: '#f59e0b', width: 4 }}>
            <RStack gap={8}>
              <RText size={14} weight={600}>
                Sales target: 72% of ₱1,500.00 today
              </RText>
              <RProgress value={72} color="#f59e0b" />
            </RStack>
          </RCard>
          <RCard radius={16} border="default" pad={16}>
            <RStack gap={10}>
              <RStack dir="row" justify="between" align="center">
                <RPill label="Business Insight" icon={Bot} radius={20} size="md" />
                <RStateSequence
                  frames={[
                    { atMs: 0, node: <RPill label="Enhance with AI" icon={Sparkles} /> },
                    { atMs: 2600, node: <RPill label="AI-generated" icon={Sparkles} color="#27ae60" /> },
                  ]}
                />
              </RStack>
              <RText size={14} lh={22} color={rToken.ink2}>
                <RTypewriter text="Online orders reached 24% of revenue this month while ingredient waste stayed under 2%." startMs={2600} />
              </RText>
              <RStateSequence
                frames={[
                  { atMs: 0, node: <RButton look="soft" label="Generate report" icon={Sparkles} h={44} fontSize={14} full /> },
                  { atMs: 1200, node: <RButton look="soft" label="Generating…" state="loading" h={44} fontSize={14} full /> },
                  { atMs: 2400, node: <RButton look="solid" label="Report ready" state="success" h={44} fontSize={14} full /> },
                ]}
              />
            </RStack>
          </RCard>
          <RCard radius={12} border="default" pad={16}>
            <RVTimeline
              steps={[
                { label: 'Confirmed', state: 'done' },
                { label: 'Preparing', state: 'done' },
                { label: 'Out for delivery', state: 'active' },
                { label: 'Completed', state: 'pending' },
              ]}
            />
          </RCard>
        </RStack>
      </RAutoScroll>
    </>
  );
}
