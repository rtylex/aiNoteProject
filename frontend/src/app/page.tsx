'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Brain, Users, BarChart3, Mail } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function IntroPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Neural network nodes
    interface Node {
      x: number
      y: number
      vx: number
      vy: number
    }

    const nodes: Node[] = []
    const nodeCount = 80
    const connectionDistance = 150
    const mouseRadius = 200

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      })
    }

    let mouseX = -1000
    let mouseY = -1000

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 15, 26, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw nodes
      nodes.forEach((node) => {
        // Update position
        node.x += node.vx
        node.y += node.vy

        // Bounce off walls
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Mouse interaction
        const dx = mouseX - node.x
        const dy = mouseY - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouseRadius) {
          const force = (mouseRadius - dist) / mouseRadius
          node.vx -= (dx / dist) * force * 0.02
          node.vy -= (dy / dist) * force * 0.02
        }

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(147, 51, 234, 0.6)'
        ctx.fill()
      })

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * 0.3
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      requestAnimationFrame(animate)
    }

    // Initial clear
    ctx.fillStyle = '#0a0f1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Animated Neural Network Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: '#0a0f1a' }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f1a]/50 to-[#0a0f1a] z-[1]" />

      <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 px-4 py-2 rounded-full text-sm text-violet-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          AKADEMİK AR-GE
        </div>

        {/* Main Title - AI Style Font */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-center mb-2 tracking-tight uppercase">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            AKADEMİK ZEKA
          </span>
        </h1>
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-center mb-10 tracking-tight uppercase">
          <span className="bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(139,92,246,0.5)]">
            AI
          </span>
        </h2>

        {/* Description */}
        <p className="text-center text-gray-400 max-w-3xl mb-14 text-lg md:text-xl leading-relaxed">
          Akademik verilerle eğitilen yapay zeka dil modeli, öğrencilere çalışma süreçlerinde rehberlik
          ederken; entegre sosyal ağ yapısıyla tüm paydaşları tek bir ekosistemde buluşturur.
        </p>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-14 w-full max-w-4xl">
          {/* Card 1 */}
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-500 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-cyan-400 tracking-wide">Yapay Zeka Asistanı</h3>
              <Brain className="w-6 h-6 text-cyan-400 group-hover:animate-pulse" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Literatür taraması ve akademik dilde özel rehberlik.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-violet-500/50 hover:bg-white/10 transition-all duration-500 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-violet-400 tracking-wide">Sosyal Ekosistem</h3>
              <Users className="w-6 h-6 text-violet-400 group-hover:animate-pulse" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Akademisyen ve öğrencilerin anlık iletişim kurabildiği güvenilir ağ.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-fuchsia-500/50 hover:bg-white/10 transition-all duration-500 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-fuchsia-400 tracking-wide">Akıllı Analiz</h3>
              <BarChart3 className="w-6 h-6 text-fuchsia-400 group-hover:animate-pulse" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Eksikleri tespit eden adaptif deneme ve tekrar haritaları.
            </p>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 mb-14 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-2">PROJE GELİŞTİRİCİSİ</p>
            <p className="text-xl font-bold text-white tracking-wide">Emirhan Yirik</p>
          </div>
          <div className="hidden md:block w-px h-12 bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-2">PROJE DANIŞMANI</p>
            <p className="text-xl font-bold text-white tracking-wide">Dr. Öğr. Üyesi Doruk Ayberkin</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/home">
            <Button
              size="lg"
              className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 hover:from-rose-600 hover:via-pink-600 hover:to-fuchsia-600 text-white px-10 h-14 text-lg font-bold rounded-xl shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_50px_rgba(236,72,153,0.6)] transition-all duration-300 hover:scale-105"
            >
              Sisteme Giriş Yap
            </Button>
          </Link>
          <Link href="mailto:info@yirik.site">
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 px-10 h-14 text-lg font-medium rounded-xl backdrop-blur-sm transition-all duration-300"
            >
              <Mail className="mr-2 h-5 w-5" />
              İletişime Geç
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
