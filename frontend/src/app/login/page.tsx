import LoginForm from '@/components/auth/login-form'

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
            <LoginForm />
        </div>
    )
}
