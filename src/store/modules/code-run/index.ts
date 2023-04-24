import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import Message from '@arco-design/web-vue/es/message'
import i18n from '@/locale'
import editorAPI from '@/api/editor'
import dayjs from 'dayjs'
import { dateTypes } from '@/views/dashboard/config'
import { AnyObject } from '@/types/global'
import { HttpResponse, OutputType } from '@/api/interceptor'
import { ResultType, DimensionType, SchemaType } from './types'
import { Log, ResultInLog } from '../log/types'

const useCodeRunStore = defineStore('codeRun', () => {
  const { promForm } = useQueryCode()

  const results = ref<ResultType[]>([])
  const resultsId = ref(0)

  // TODO: Add all the types we decide instead of ECharts if needed in the future.
  const getDimensionsAndXName = (schemas: SchemaType[]) => {
    const tempDimensions: Array<DimensionType> = []
    let xAxisName = ''
    let findTimeFlag = false
    schemas.forEach((schema: SchemaType) => {
      if (!findTimeFlag && dateTypes.find((type: string) => type === schema.data_type)) {
        findTimeFlag = true
        xAxisName = schema.name
      }
      const oneDimension = {
        name: schema.name,
        // Note: let ECharts decide type for now.
      }

      tempDimensions.push(oneDimension)
    })
    return [tempDimensions, xAxisName]
  }

  const API_MAP: AnyObject = {
    sql: editorAPI.runSQL,
    python: editorAPI.runScript,
    promQL: editorAPI.runPromQL,
  }

  const runCode = async (codeInfo: string, type: string, withoutSave = false) => {
    try {
      // TODO: try something better
      let oneResult = {} as ResultType
      const res: HttpResponse = await API_MAP[type](codeInfo)
      Message.success({
        content: i18n.global.t('dataExplorer.runSuccess'),
        duration: 2 * 1000,
      })
      const resultsInLog: Array<ResultInLog> = []
      res.output.forEach((oneRes: OutputType) => {
        if ('records' in oneRes) {
          const rowLength = oneRes.records.rows.length
          resultsInLog.push({
            records: rowLength,
          })
          if (rowLength >= 0) {
            resultsId.value += 1
            oneResult = {
              records: oneRes.records,
              dimensionsAndXName: rowLength === 0 ? [] : getDimensionsAndXName(oneRes.records.schema.column_schemas),
              key: resultsId.value,
              type,
            }
            if (!withoutSave) {
              results.value.push(oneResult)
            }
          }
        }
        if ('affectedrows' in oneRes) {
          resultsInLog.push({
            affectedRows: oneRes.affectedrows,
          })
        }
      })
      const oneLog: Log = {
        type,
        ...res,
        codeInfo,
        results: resultsInLog,
      }
      if (type === 'promQL') {
        oneLog.promInfo = {
          Start: dayjs.unix(+promForm.value.start).format('YYYY-MM-DD HH:mm:ss'),
          End: dayjs.unix(+promForm.value.end).format('YYYY-MM-DD HH:mm:ss'),
          Step: promForm.value.step,
          Query: codeInfo,
        }
      }
      // TODO: try something better
      return {
        log: oneLog,
        record: oneResult,
      }
    } catch (error: any) {
      const oneLog = {
        type,
        codeInfo,
        ...error,
      }
      if ('error' in error) {
        return {
          log: oneLog,
        }
      }
      return { error: 'error' }
    }
  }

  const saveScript = async (name: string, code: string, type = 'python') => {
    try {
      const res: any = await editorAPI.saveScript(name, code)
      return {
        type,
        codeInfo: name,
        ...res,
      }
    } catch (error: any) {
      if ('error' in error) {
        throw new Error(JSON.stringify(error))
      } else {
        throw new Error('error')
      }
    }
  }

  const clear = (type: string | string[]) => {
    const types = Array.isArray(type) ? type : [type]
    results.value = results.value.filter((result) => !types.includes(result.type))
  }

  const removeResult = (key: number) => {
    results.value = results.value.filter((item: ResultType) => item.key !== key)
  }

  return {
    results,
    runCode,
    saveScript,
    removeResult,
    clear,
  }
})
export default useCodeRunStore
