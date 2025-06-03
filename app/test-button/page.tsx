"use client"

import { Button } from "@/components/ui/button" // Assuming this path is correct

export default function TestButtonPage() {
  const handleClick = () => {
    console.log("TEST PAGE BUTTON CLICKED! Timestamp:", new Date().toISOString())
    alert("Test page button was clicked! Check the console.")
  }

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Test Button Page</h1>
      <p>This is a very simple page to test basic button functionality.</p>
      <Button onClick={handleClick} size="lg">
        Click Me for Test
      </Button>
      <p style={{ marginTop: "20px" }}>After clicking, check your browser's developer console for a message.</p>
    </div>
  )
}
