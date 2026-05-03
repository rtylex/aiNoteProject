'use client'

import { useState } from 'react'
import LoginForm from '@/components/auth/login-form'
import LoginSidePanel from '@/components/auth/login-side-panel'

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

    return (
        <div className="fixed inset-0 flex bg-[#fcfaf2] overflow-hidden">
            {/* Sol: Form */}
            <div className="relative w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-6 sm:px-8 overflow-y-auto">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dce2f1] via-[#eef1f8] to-[#fcfaf2]" />
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_60%,transparent_100%)]" />

                <LoginForm activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Sağ: Dinamik Panel (sadece lg+) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <LoginSidePanel activeTab={activeTab} />
            </div>
        </div>
    )
}
