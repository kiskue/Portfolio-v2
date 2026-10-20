import { ChevronRight, CircleAlert, Droplets, Folder, House, MapPin, Puzzle, Sparkles, TriangleAlert, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  RAppBar,
  RAvatar,
  RButton,
  RCard,
  RDivider,
  RIconChip,
  RPill,
  RSegmentBar,
  RSegmented,
  RStack,
  RTabBar,
  RText,
  rBrand,
  rTint,
  rToken,
} from '@/components/replicas/kit';

/** The PAGASA heat-index bands (fixed colours, never re-skinned). */
const HEAT_BANDS = [
  { flex: 5, color: '#ffff00' },
  { flex: 9, color: '#f1c232' },
  { flex: 10, color: '#ff6d01' },
  { flex: 9, color: '#ff0000' },
] as const;

const TABS = [
  { icon: House, label: 'Home', active: true },
  { icon: Folder, label: 'Hotlines' },
  { icon: CircleAlert, label: 'Hazards' },
  { icon: Puzzle, label: 'Reports' },
] as const;

/**
 * A Citizen-style home screen built ONLY from kit parts with fictional data (research sample
 * data). Brand hues use rBrand, so BrandVars re-skins the menu, logo tile, chevron tile, EN / FIL
 * toggle, brief glyph, outline button and tab pill; the heat bands and SOS red never change.
 * Not a registered figure: the real 2.1 replica is W4's.
 */
export function SampleCitizenHome(): ReactNode {
  return (
    <>
      <RAppBar look="citizen" title="Your one-stop-app for situational awareness" titleSize={10} logo />
      <RStack gap={12} pad={[12, 10]}>
        <RCard radius={20} shadow="md">
          <RStack dir="row" align="center" gap={10} pad={[12, 16]}>
            <RStack grow gap={2}>
              <RText size={13} weight={600}>
                Sample Weather Station 01
              </RText>
              <RStack dir="row" align="center" gap={3}>
                <MapPin size={9} color={rToken.ink3} />
                <RText size={10} color={rToken.ink3}>
                  Brgy. Example, Sample City
                </RText>
              </RStack>
            </RStack>
            <RPill label="Live" color="#22c55e" dot="pulse" upper size="xs" />
            <RIconChip icon={ChevronRight} color={rBrand.primary} size={26} radius={8} shape="square" tint={8} iconSize={16} />
          </RStack>
          <RDivider />
          <RStack dir="row" align="center" gap={16} pad={[14, 16, 10]}>
            <RStack dir="row" align="baseline" gap={2}>
              <RText size={26} weight={700} lh={30} tabular>
                31.4
              </RText>
              <RText size={13} color={rToken.ink3}>
                °C
              </RText>
            </RStack>
            <RStack grow gap={4} align="start">
              <RText size={10} color={rToken.ink3}>
                Heat Index 38.2°C (est.)
              </RText>
              <RPill label="AQI · Good" color="#22c55e" size="xs" dot />
            </RStack>
          </RStack>
          <RStack dir="row" gap={8} pad={[0, 16, 14]}>
            <RPill label="Humidity 74%" icon={Droplets} color="#3b82f6" radius={8} tint={7} size="md" textColor={rToken.ink2} />
            <RPill label="12.6 km/h NE" icon={Wind} color="#6366f1" radius={8} tint={7} size="md" textColor={rToken.ink2} />
          </RStack>
          <RDivider />
          <RStack gap={8} pad={[12, 16, 16]}>
            <RStack dir="row" justify="between" align="center">
              <RText size={11} weight={600} upper tracking={0.7} color={rToken.ink2}>
                Heat index
              </RText>
              <RText size={16} weight={700} tabular>
                38.2°C
              </RText>
            </RStack>
            <RSegmentBar segments={HEAT_BANDS} marker={{ at: 31, color: '#f1c232' }} ticks={['27°C', '33°C', '42°C', '52°C+']} />
            <RCard radius={10} pad={[10, 12]} bg="#fff7ed" edge={{ side: 'left', color: '#c2410c', width: 3 }}>
              <RStack dir="row" gap={8} align="center">
                <TriangleAlert size={14} color="#c2410c" />
                <RText size={11} weight={700} color="#c2410c" upper tracking={0.4}>
                  Extreme caution
                </RText>
              </RStack>
            </RCard>
          </RStack>
        </RCard>

        <RCard radius={16} pad={14} bg={rTint('#f97316', 6)} borderColor={rTint('#f97316', 16)}>
          <RStack gap={10}>
            <RStack dir="row" align="center" gap={8}>
              <RIconChip icon={Sparkles} color={rBrand.accent} size={26} shape="circle" iconSize={14} />
              <RText size={11} weight={600} upper tracking={0.6} color={rToken.ink2} style={{ flex: 1 }}>
                Safety brief
              </RText>
              <RSegmented look="toggle" options={['EN', 'FIL']} active={0} />
            </RStack>
            <RText size={13} weight={600} lh={18}>
              Hot and humid this afternoon: limit time outdoors
            </RText>
            <RText size={12} lh={17} color={rToken.ink2}>
              The heat index is in the Extreme Caution band. Drink water often and rest in the shade between 11 AM and 3 PM.
            </RText>
            <RButton look="outline" label="Ask about conditions" h={38} radius="full" fontSize={12} full />
            <RText size={9} color={rToken.ink3}>
              Fictional sample data.
            </RText>
          </RStack>
        </RCard>
      </RStack>
      <RTabBar
        look="citizen-floating"
        items={TABS}
        center={
          <RAvatar
            initials="SOS"
            size={80}
            bg="linear-gradient(180deg, #d84343 25%, #b02b2b 100%)"
            ring="#ffffff"
            ringWidth={4}
            textColor="#ffffff"
            fontSize={19}
            style={{ letterSpacing: '0.5px', boxShadow: '0 6px 18px rgb(216 67 67 / 0.45)' }}
          />
        }
      />
    </>
  );
}
