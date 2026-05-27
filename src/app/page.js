'use client'

import dynamic from 'next/dynamic'

const BodyChecker = dynamic(() => import('@/components/BodyChecker'), {
  ssr: false,
})

export default function Home() {
  return <BodyChecker />
}
