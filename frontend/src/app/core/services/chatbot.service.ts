import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { ChatRequest, ChatResponse } from '../models/chatbot.models';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {

  constructor(private readonly apiClient: ApiClientService) {}

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.apiClient.post<ChatResponse>('/api/chat', request);
  }
}
