'use client'

import { useState } from 'react'
import LoginForm from '@/components/auth/login-form'
import LoginSidePanel from '@/components/auth/login-side-panel'

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

    return (
        <div className="fixed inset-0 flex bg-paper overflow-hidden">
            {/* Sol: Form */}
            <div className="relative w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-6 sm:px-8 overflow-y-auto">
                <div className="absolute inset-0 -z-10 paper-texture opacity-50" />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-parchment via-paper to-paper" />

                <LoginForm activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Sağ: Dinamik Panel (sadece lg+) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <LoginSidePanel activeTab={activeTab} />
            </div>
        </div>
    )
}
