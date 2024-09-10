import { GeneratedAPIs } from 'googleapis/build/src/apis'
import { Pupil } from './dto'
import { google, GoogleApis, sheets_v4 } from 'googleapis'
import {Kafka, KafkaConfig, Producer, Message } from 'kafkajs'

class DB{
  getPupil(source:string, id:number|undefined): (Pupil | undefined){
    if(id === undefined){
      return undefined;
    }
    var params: sheets_v4.Params$Resource$Spreadsheets$Developermetadata$Search= {}
    params.auth = this.auth
    params.spreadsheetId = this.sid
    params.requestBody = {}
    params.requestBody.dataFilters = [{
      developerMetadataLookup : {
        locationType: 'ROW',
        metadataKey: 'source',
        metadataValue: source,
      }
    }];
    this.sheet.spreadsheets.developerMetadata.search(params)

    return undefined
  }
  savePupil(source: string, id:number|undefined, pupil:Pupil):void{
    // if id is undefined append instead
    this.appendPupil(source,id,pupil)
    // var params: sheets_v4.Params$Resource$Spreadsheets$Batchupdate = {}
    //
    //
    // this.sheet.spreadsheets.batchUpdate(params)
  }
  appendPupil(source:string, id:number|undefined, pupil:Pupil):void{
    var params: sheets_v4.Params$Resource$Spreadsheets$Values$Append = {}
    params.auth = this.auth
    params.spreadsheetId = this.sid
    params.requestBody = {}
    params.requestBody.values = [[source, id, pupil.name, pupil.age, pupil.contact]]
    params.range = 'list!A:A'
    params.valueInputOption = 'RAW'

    this.sheet.spreadsheets.values.append(params)
    if(this.producer !== undefined){
      var key: string = source
      if(id !== undefined){
        key += id?.toString()
      }
      var event = {
        type: "append",
        source: source,
        id: id,
        pupil: pupil
      }
      var message: Message = {
        key: key,
        value: event.toString(),
        headers: {
          source: "tgbot"
        }
      }
      this.producer.send({
        topic: "pupil",
        messages: [message],
      })
    }
  }
  constructor(keyFile: string | undefined, _sid: string | undefined, broker: string | undefined){
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
    }else 
      throw new Error("No kafka broker provided")
  }
  producer: Producer | undefined
  kafka: Kafka | undefined
  auth: any
  sheet: sheets_v4.Sheets
  sid: string
}

export const db = new DB(process.env.GAUTH_KEY,process.env.SHEET_ID,process.env.KAFKA_BROKER)
