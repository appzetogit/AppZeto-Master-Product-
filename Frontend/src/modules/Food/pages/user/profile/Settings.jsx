import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Card, CardHeader, CardTitle, CardContent } from "@food/components/ui/card"
import { Label } from "@food/components/ui/label"
import { Switch } from "@food/components/ui/switch"
import { Button } from "@food/components/ui/button"

export default function Settings() {
  return (
    <AnimatedPage className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/user/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <ArrowLeft className="h-5 w-5 text-black dark:text-white" />
            </Button>
          </Link>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-white">Settings</h1>
        </div>
        <Card className="bg-white dark:bg-[#1a1a1a] border-0 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Notifications & Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about your orders via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </AnimatedPage>
  )
}

