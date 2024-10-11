import { google, GoogleApis, sheets_v4 } from 'googleapis'
import {Kafka, KafkaConfig, Producer, Message } from 'kafkajs'

export type Pupil = {
  source: string,
  id?: number|undefined,
  name?: string|undefined,
  city?: string|undefined,
  request?: string|undefined,
  contact?: string|undefined,
  age?: string|undefined,
  timestamp?: string|undefined
}
class DB{
  async getPupil(source:string, id:number|undefined): Promise<Pupil | undefined>{
    if(id === undefined){
      return undefined;
    }
    // var params: sheets_v4.Params$Resource$Spreadsheets$Values$Get = {
    //   auth: this.auth,
    //   spreadsheetId: this.sid,
    //   range:this.list
    // }
    // var response = await this.sheet.spreadsheets.values.get(params)
    // // var prow = response.result
    return undefined
  }
  async submit(pupil:Pupil):Promise<Pupil>{
    var params: sheets_v4.Params$Resource$Spreadsheets$Values$Append = {}
    params.auth = this.auth
    params.spreadsheetId = this.sid
    params.requestBody = {}
    params.requestBody.values = [[pupil.source, pupil.id, pupil.timestamp, pupil.name, pupil.age, pupil.city, pupil.request, pupil.contact]]
    params.range = this.list
    params.valueInputOption = 'RAW'

    await this.sheet.spreadsheets.values.append(params)
    if(this.producer !== undefined){
      var key: string = pupil.source
      if(pupil.id !== undefined){
        key += pupil.id?.toString()
      }
      var event = {
        type: "submit",
        pupil: pupil
      }
      var message: Message = {
        key: key,
        value: event.toString(),
      }
      await this.producer.send({
        topic: "pupil",
        messages: [message],
      })
    }
    return pupil
  }
  constructor(keyFile: string | undefined, _sid: string | undefined, broker: string | undefined, _list: string | undefined){
    if(_list === undefined) throw new Error("list is not provided")
    this.list = _list!
    this.auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    })
    this.sheet = google.sheets("v4")
    if(_sid !== undefined)
      this.sid = _sid;
    else
      throw new Error("No spreadsheet ID provided")
    if(broker !== undefined){
      broker = process.env.KAFKA_BROKER;
      var kafkaConfig:KafkaConfig = { brokers: [broker!]}
      this.kafka = new Kafka(kafkaConfig)
      this.producer = this.kafka.producer()
      this.producer.connect()
    }else {
      throw new Error("No kafka broker provided")
    }
  }
  producer: Producer | undefined
  kafka: Kafka | undefined
  auth: any
  sheet: sheets_v4.Sheets
  sid: string
  list: string
}

export const db = new DB(process.env.GAUTH_KEY,process.env.SHEET_ID,process.env.KAFKA_BROKER, process.env.LIST)
