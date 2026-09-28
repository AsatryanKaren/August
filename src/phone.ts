export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('3740') && digits.length === 12) digits = `374${digits.slice(4)}`
  else if (!digits.startsWith('374') && digits.startsWith('0') && digits.length === 9) digits = `374${digits.slice(1)}`
  else if (!digits.startsWith('374') && digits.length === 8) digits = `374${digits}`
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

export function formatPhone(digits: string) {
  if (digits.startsWith('374') && digits.length === 11) {
    return `+374 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  return `+${digits}`
}

export function breakfastProgress(count: number) {
  const rewards = Math.floor(count / 10)
  const stamps = count === 0 ? 0 : count % 10 === 0 ? 10 : count % 10
  return { count, stamps, rewards }
}
