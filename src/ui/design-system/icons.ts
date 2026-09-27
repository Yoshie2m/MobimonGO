import advancedDevice from './icons/advanced-device.svg'
import factoryAutomation from './icons/factory-automation.svg'
import foodValueChain from './icons/food-value-chain.svg'
import fuelControl from './icons/fuel-control.svg'
import mobility from './icons/mobility.svg'
import motorControl from './icons/motor-control.svg'
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
} as const

/**
 * 事業分野の目印のアイコン。デザインシステムに対応するアイコンがない分野(補修・修理、ホーム)は null。
 */
export function fieldIcon(field: string | null): string | null {
  switch (field) {
    case 'サーマルマネジメント&エアコンシステム':
      return thermalSystem
    case 'パワートレインシステム':
      return motorControl
    case 'セーフティ&コックピットシステム':
      return mobility
    case '半導体・先進デバイス':
      return advancedDevice
    case 'インダストリー':
      return factoryAutomation
    case 'フードバリューチェーン':
      return foodValueChain
    default:
      return null
  }
}
