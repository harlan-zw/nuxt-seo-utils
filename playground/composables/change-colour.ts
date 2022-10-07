export function useChangeColour() {
  const counter = ref(0)
  const colour = ref('limegreen')

  const changeColour = () => {
    counter.value++
    switch (counter.value) {
      case 1:
        colour.value = 'red'
        return
      case 2:
        colour.value = 'limegreen'
        return
      case 3:
        colour.value = 'lightskyblue'
        return
      case 4:
        colour.value = 'yellow'
        return
      default:
        colour.value = 'aquamarine'
        counter.value = 0
    }
  }

  return {
    changeColour,
    colour,
  }
}
