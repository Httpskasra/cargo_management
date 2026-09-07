import './globals.css'
import AppShell from '@/components/AppShell'
export const metadata={title:'Cargo Manager',description:'مدیریت رانشیت و بارکد'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body><AppShell>{children}</AppShell></body></html>}
