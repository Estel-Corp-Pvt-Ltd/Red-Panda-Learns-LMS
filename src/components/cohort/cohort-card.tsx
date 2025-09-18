import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, DollarSign, MapPin } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cohort } from '@/types/cohort';
import { Course } from '@/types/api';
import { useCohort } from '@/contexts/CohortContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CohortCardProps {
  cohort: Cohort;
  course?: Course;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
}

export const CohortCard: React.FC<CohortCardProps> = ({ 
  cohort, 
  course, 
  className,
  variant = 'default' 
}) => {
  const { user } = useAuth();
  const { isEnrolledInCohort } = useCohort();
  const isEnrolled = user ? isEnrolledInCohort(cohort.id) : false;

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${price?.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-success text-success-foreground';
      case 'in-progress': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const spotsLeft = cohort.maxStudents - cohort.currentEnrollments;
  const isNearFull = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;

  return (
    <Card className={cn(
      "group hover:shadow-lg transition-all duration-300 border-border",
      variant === 'featured' && "border-primary shadow-md",
      className
    )}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {cohort.name}
            </CardTitle>
            {course && (
              <p className="text-sm text-muted-foreground">
                Based on: {course.post_title}
              </p>
            )}
          </div>
          <Badge className={cn("capitalize", getStatusColor(cohort.status))}>
            {cohort.status === 'in-progress' ? 'In Progress' : cohort.status}
          </Badge>
        </div>

        {cohort.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {cohort.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(cohort.startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{cohort.weeklySchedule.length} weeks</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{cohort.currentEnrollments}/{cohort.maxStudents}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatPrice(cohort.price, cohort.currency)}</span>
          </div>
        </div>

        {isNearFull && (
          <Badge variant="outline" className="w-full justify-center text-warning border-warning">
            Only {spotsLeft} spots left!
          </Badge>
        )}

        {isFull && (
          <Badge variant="outline" className="w-full justify-center text-destructive border-destructive">
            Cohort Full
          </Badge>
        )}

        {isEnrolled && (
          <Badge variant="outline" className="w-full justify-center text-success border-success">
            ✓ Enrolled
          </Badge>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link to={`/cohort/${cohort.id}`}>
            View Details
          </Link>
        </Button>
        
        {!isEnrolled && cohort.status === 'open' && !isFull ? (
          <Button asChild className="flex-1">
            <Link to={`/cohort/${cohort.id}/checkout`}>
              Enroll Now
            </Link>
          </Button>
        ) : isEnrolled ? (
          <Button asChild className="flex-1">
            <Link to={`/cohort/${cohort.id}/dashboard`}>
              Continue Learning
            </Link>
          </Button>
        ) : (
          <Button disabled className="flex-1">
            {isFull ? 'Full' : 'Closed'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};