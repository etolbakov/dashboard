const sqlCode = ref('Select * From monitor')
const cursorAt = ref<Array<number>>([])
// TODO: compare sqlResult's code and current code
const { currentResult } = storeToRefs(useCodeRunStore())

export default function useDataExplorer() {
  // TODO: change to computed instead of using array?

  const insertCode = (value: any) => {
    sqlCode.value = `${sqlCode.value}\n${value}`
  }

  const insertNameToCode = (name: any) => {
    sqlCode.value = sqlCode.value.substring(0, cursorAt.value[0]) + name + sqlCode.value.substring(cursorAt.value[1])
  }

  // TODO: save code temp to local storage

  return {
    insertCode,
    insertNameToCode,
    sqlCode,
    cursorAt,
  }
}
