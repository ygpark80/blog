import { Platform, SQSProcessor } from "./base"
import { CalendarService } from "../services/calendar"

interface CalendarPayload {
    id: string
}

export const handler = SQSProcessor.handler<CalendarPayload>(async (payload) => {
    console.log("Payload=", payload)

    const service = await Platform.get<CalendarService>(CalendarService)
    console.log("calendarService=", service.findAll())
})
