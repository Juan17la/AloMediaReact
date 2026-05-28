export function seekEl(el: HTMLVideoElement, time: number): void {
  if (typeof el.fastSeek === "function") {
    el.fastSeek(time)
  } else {
    el.currentTime = time
  }
}