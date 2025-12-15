import { ChatLayout } from '@/components/chat/chat-layout'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    return <ChatLayout documentId={resolvedParams.id} />
}
