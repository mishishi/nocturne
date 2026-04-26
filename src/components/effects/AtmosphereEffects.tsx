import { StarField } from './StarField'
import { BreathingOrb } from './BreathingOrb'
import { FloatingDust } from './FloatingDust'

export function AtmosphereEffects() {
  return (
    <>
      <BreathingOrb />
      <StarField />
      <FloatingDust />
    </>
  )
}
