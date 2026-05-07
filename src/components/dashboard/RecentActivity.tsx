import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface Activity {
  id: string;
  type: 'order' | 'review' | 'product' | 'user' | 'payment';
  message: string;
  time: string;
  user?: string;
}

const activityIcons: Record<Activity['type'], string> = {
  order: '📦',
  review: '⭐',
  product: '🌾',
  user: '👤',
  payment: '💰',
};

interface RecentActivityProps {
  activities: Activity[];
  title?: string;
  className?: string;
}

export const RecentActivity = ({ activities, title = 'Recent Activity', className }: RecentActivityProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6">
          <div className="space-y-4 pb-6">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                  {activityIcons[activity.type]}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-tight">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
