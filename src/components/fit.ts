// How much the phone is scaled down to fit the browser window (1 = real size).
// Pointer movement arrives in window pixels, so drags divide by this to stay under the finger.
let fit = 1
export const getFit = () => fit
export const setFit = (k: number) => {
  fit = k
}
