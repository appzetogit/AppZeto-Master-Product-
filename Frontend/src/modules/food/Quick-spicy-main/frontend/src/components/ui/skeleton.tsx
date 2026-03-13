import { cn } from "@food/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      {...props}
    />
  )
}

export { Skeleton }
