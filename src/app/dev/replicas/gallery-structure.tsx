import {
  Bot,
  Clock,
  Droplets,
  Footprints,
  House,
  MapPin,
  Package,
  Phone,
  Mic,
  PhoneOff,
  ShieldCheck,
  ShoppingBag,
  Siren,
  Sparkles,
  TrendingUp,
  User,
  ClipboardList,
  CircleAlert,
  Folder,
  Puzzle,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  RAppBar,
  RButton,
  RCard,
  RCountBadge,
  RDivider,
  RGlassButton,
  RIconChip,
  RKpiTile,
  RListRow,
  RPill,
  RSegmented,
  RStack,
  RTabBar,
  RText,
  rBrand,
  rToken,
} from '@/components/replicas/kit';
import { Specimen } from './specimen';

/** Gallery part 1: canvas and type, bars, surfaces and controls. */
export function GalleryStructure(): ReactNode {
  return (
    <>
      <Specimen name="RCanvas" note="SME light (system font, fixed navy)" app="sme">
        <RStack gap={6}>
          <RText size={16} weight={700}>
            data-app=&quot;sme&quot; · light
          </RText>
          <RText size={14} color={rToken.ink3}>
            Tokens from replica.css: canvas, surface, ink, border, brand.
          </RText>
        </RStack>
      </Specimen>
      <Specimen name="RCanvas" note="SME AI dark set" app="sme" theme="dark">
        <RStack gap={6}>
          <RText size={16} weight={700}>
            data-app=&quot;sme&quot; · dark
          </RText>
          <RText size={14} color={rToken.ink3}>
            #0F0F14 canvas, #151A27 cards, #4F9EFF accent.
          </RText>
        </RStack>
      </Specimen>
      <Specimen name="RStack · RText · RDivider" note="Poppins on Defensys canvases">
        <RStack gap={8}>
          <RText size={21} weight={700} color={rBrand.titleInk}>
            Report Incident
          </RText>
          <RText size={12.25} color={rToken.ink3}>
            Help us respond quickly and effectively
          </RText>
          <RDivider />
          <RStack dir="row" justify="between">
            <RText size={11} weight={600} upper tracking={0.7} color={rToken.ink2}>
              Air quality
            </RText>
            <RText size={11} weight={600} color="#22c55e">
              Good
            </RText>
          </RStack>
        </RStack>
      </Specimen>

      <Specimen name="RAppBar" note="citizen · responder" pad={0}>
        <RStack gap={8}>
          <RAppBar look="citizen" title="Hazard Monitoring" logo inset={false} />
          <RAppBar
            look="responder"
            title="Emergency Map"
            inset={false}
            trailing={<RPill label="You're Online" color="#22c55e" dot fill="outline" bg="#f8f9fa" textColor="#0f172a" />}
          />
        </RStack>
      </Specimen>
      <Specimen name="RAppBar" note="sme (wordmark, bell badge) · sheet" app="sme" pad={0}>
        <RStack gap={8}>
          <RAppBar look="sme" logo badge={3} inset={false} />
          <RAppBar look="sheet" leading="back" title="Hazard Report" titleColor={rBrand.primary} inset={false} />
        </RStack>
      </Specimen>

      <Specimen name="RTabBar" note="citizen-floating with a centre control" height={140} pad={0}>
        <RTabBar
          look="citizen-floating"
          bottom={14}
          items={[
            { icon: House, label: 'Home', active: true },
            { icon: Folder, label: 'Hotlines' },
            { icon: CircleAlert, label: 'Hazards' },
            { icon: Puzzle, label: 'Reports' },
          ]}
          center={<RIconChip icon={Siren} color="#d84343" size={56} shape="circle" solid />}
        />
      </Specimen>
      <Specimen name="RTabBar" note="responder-pill (the map's action pill)" app="responder" height={130} pad={0}>
        <RTabBar
          look="responder-pill"
          bottom={24}
          items={[
            { icon: CircleAlert, label: 'Report' },
            { icon: Footprints, label: 'Offline Respond' },
            { icon: Phone, label: 'Call' },
          ]}
        />
      </Specimen>
      <Specimen name="RTabBar" note="sme-glass (docked, safe-area padding)" app="sme" height={130} pad={0}>
        <RTabBar
          look="sme-glass"
          items={[
            { icon: House, label: 'Home', active: true },
            { icon: ClipboardList, label: 'Orders' },
            { icon: User, label: 'Profile' },
          ]}
        />
      </Specimen>

      <Specimen name="RCard · RListRow" note="faint border, left edge, chevron">
        <RCard radius={14} border="faint" pad={14} edge={{ side: 'left', color: '#ef4444', width: 4 }}>
          <RListRow
            leading={<RIconChip icon={Droplets} color="#3b82f6" size={49} shape="circle" tint={8} />}
            title="Flood"
            subtitle="Knee-deep water near the sample overpass"
            meta={
              <>
                <span>
                  <MapPin size={10} /> 1.2 km away
                </span>
                <span>
                  <Clock size={10} /> 10:42 AM • 2 hours ago
                </span>
              </>
            }
            trailing="chevron"
          />
        </RCard>
      </Specimen>
      <Specimen name="RCard" note="SME AI dark: glow, accent bar" app="sme" theme="dark">
        <RCard radius={16} border="default" glow="rgb(79 158 255 / 0.12)" pad={16}>
          <RStack gap={12}>
            <RStack dir="row" justify="between" align="center">
              <RPill label="Business Insight" icon={Bot} color={rBrand.primary} tint={15} radius={20} size="md" />
              <RPill label="Enhance with AI" icon={Sparkles} color={rBrand.primary} tint={10} />
            </RStack>
            <RDivider color={rBrand.primary} thickness={3} style={{ borderRadius: 2 }} />
            <RText size={14} lh={22} color={rToken.ink2}>
              This month: ₱48,250 in revenue and ₱10,170 in net profit.
            </RText>
          </RStack>
        </RCard>
      </Specimen>
      <Specimen name="RKpiTile" note="kpi · stat-tile" app="sme">
        <RStack dir="row" gap={10}>
          <RKpiTile look="kpi" icon={TrendingUp} label="Gross Income" value="₱48,250.00" accent="#27ae60" style={{ flex: 1 }} />
          <RKpiTile look="kpi" icon={ShoppingBag} label="Products Sold" value="1,284" accent="#1e4d8c" style={{ flex: 1 }} />
        </RStack>
        <RStack dir="row" gap={10} style={{ marginTop: 10 }}>
          <RKpiTile look="stat-tile" icon={Wallet} label="Avg daily revenue" value="₱1,742" accent="#1e4d8c" style={{ flex: 1 }} />
          <RKpiTile look="stat-tile" icon={Package} label="In-store Sales" value="₱36,900" sub="412 orders" accent="#27ae60" style={{ flex: 1 }} />
        </RStack>
      </Specimen>

      <Specimen name="RButton" note="solid · outline · soft · danger · states">
        <RStack gap={8}>
          <RButton look="solid" label="Submit Report" color={rBrand.secondary} full />
          <RStack dir="row" gap={8}>
            <RButton look="outline" label="DECLINE" color="#ef4444" borderColor="rgb(239 68 68 / 0.3)" h={46} radius={14} fontSize={13} style={{ flex: 1 }} />
            <RButton look="solid" label="ACCEPT" color="#085499" h={46} radius={14} fontSize={13} style={{ flex: 1 }} />
          </RStack>
          <RStack dir="row" gap={8}>
            <RButton look="soft" label="Generate report" icon={Sparkles} h={44} fontSize={14} style={{ flex: 1 }} />
            <RButton look="danger" label="Confirm Call" h={44} fontSize={14} style={{ flex: 1 }} />
          </RStack>
          <RStack dir="row" gap={8}>
            <RButton look="solid" label="Saving" state="loading" h={44} fontSize={14} style={{ flex: 1 }} />
            <RButton look="solid" label="Sale Confirmed!" state="success" h={44} fontSize={14} style={{ flex: 1 }} />
          </RStack>
          <RButton look="solid" label="Checkout" sublabel="3 items · ₱310.00" color="#1e4d8c" h={56} full />
        </RStack>
      </Specimen>
      <Specimen name="RGlassButton · RButton glass" note="call controls" theme="dark" height={170} pad={0}>
        <RStack dir="row" justify="around" align="end" pad={[16, 12]} bg="linear-gradient(135deg, #1a1a2e, #0f3460)" style={{ height: '100%' }}>
          <RGlassButton icon={Mic} size={56} caption="Mute" />
          <RGlassButton icon={PhoneOff} size={56} tone="tint" caption="End" />
          <RGlassButton icon={Phone} size={68} tone="solid" color="#34d399" caption="Answer" ripple={{ count: 2 }} />
          <RButton look="glass" label="Glass" h={44} />
        </RStack>
      </Specimen>

      <Specimen name="RPill" note="tint · border · solid · outline · glass · sizes">
        <RStack gap={8}>
          <RStack dir="row" gap={6} wrap>
            <RPill label="Live" color="#22c55e" dot="pulse" upper size="xs" />
            <RPill label="Medium Risk" icon={TrendingUp} color="#965f09" tint={14} />
            <RPill label="5 Due" icon={CircleAlert} color="#f59e0b" textColor="#92400e" border />
            <RPill label="URGENT" icon={CircleAlert} color="#c62828" fill="solid" size="xs" />
          </RStack>
          <RStack dir="row" gap={6} wrap>
            <RPill label="Hazard: Flood" color="#d84343" fill="outline" radius={7} size="md" textColor={rToken.ink2} />
            <RPill label="1.2 km from you" icon={MapPin} color={rBrand.primary} bg="rgb(227 240 246)" radius={7} size="md" />
          </RStack>
          <RStack dir="row" gap={6} wrap pad={8} bg="#16213e" radius={10}>
            <RPill label="In queue" icon={Clock} fill="glass" size="md" textColor="#10b981" />
            <RPill label="Join stream" icon={ShieldCheck} color="#33ccff" tint={15} border upper size="xs" />
          </RStack>
        </RStack>
      </Specimen>
      <Specimen name="RIconChip · RCountBadge" note="square · circle · solid · explicit fill">
        <RStack dir="row" gap={10} align="center" wrap>
          <RIconChip icon={TrendingUp} color="#27ae60" size={28} radius={8} shape="square" />
          <RIconChip icon={Bot} color={rBrand.primary} size={32} shape="square" />
          <RIconChip icon={MapPin} color="#d84343" size={35} shape="circle" tint={10} />
          <RIconChip icon={Siren} color="#f97316" size={38} shape="circle" bg="#ffedd5" />
          <RIconChip icon={ShieldCheck} color={rBrand.primary} size={42} shape="square" solid />
          <RCountBadge count={3} />
          <RCountBadge count={128} color="#ef4444" />
        </RStack>
      </Specimen>
      <Specimen name="RSegmented" note="pills · toggle · tabs" app="sme">
        <RStack gap={12}>
          <RSegmented look="pills" options={['Day', 'Week', 'Month', 'Year']} active={2} />
          <RSegmented look="toggle" options={['EN', 'FIL']} active={1} />
          <RSegmented look="tabs" options={['Hazards', 'Earthquake']} active={0} color="#085499" />
        </RStack>
      </Specimen>
    </>
  );
}
