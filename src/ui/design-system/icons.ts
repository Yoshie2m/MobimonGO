import advancedDevice from './icons/advanced-device.svg'
import factoryAutomation from './icons/factory-automation.svg'
import foodValueChain from './icons/food-value-chain.svg'
import fuelControl from './icons/fuel-control.svg'
import home from './icons/home.svg'
import mobility from './icons/mobility.svg'
import motorControl from './icons/motor-control.svg'
import repair from './icons/repair.svg'
import thermalSystem from './icons/thermal-system.svg'

/** デザインシステム「Mobimon」のアイコン(ink 単色の線画。<img> で表示する)。 */
export const ICONS = {
  motorControl,
  fuelControl,
  thermalSystem,
  mobility,
  advancedDevice,
  factoryAutomation,
  foodValueChain,
  repair,
  home,
} as const

/**
 * 事業分野の目印のアイコン。
 */
export function fieldIcon(field: string | null): string | null {
  switch (field) {
    case 'サーマルマネジメント':
      return thermalSystem
    case 'パワートレイン':
      return motorControl
    case 'インフォテイメント':
      return mobility
    case '先進デバイス':
      return advancedDevice
    case 'アフターサービス':
      return repair
    case 'インダストリー':
      return factoryAutomation
    case 'フードバリュー':
      return foodValueChain
    case 'スマートホーム':
      return home
    default:
      return null
  }
}
