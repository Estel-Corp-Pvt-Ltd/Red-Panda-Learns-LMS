import { QUIZ_SUBMISSION_STATUS } from '@/constants';
import { useToast } from '@/hooks/use-toast';
import { Quiz } from '@/types/quiz';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Ban, BookOpen, Calendar, CheckSquare, Clock, Folder, Play, Timer, Trophy, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuizCardProps {
  submissionsData: {
    quizId: string;
    status: string;
    totalScore?: number;
    releaseScores?: boolean;
    passed?: boolean;
  }[];
  quiz: Quiz;
}

const QuizCard: React.FC<QuizCardProps> = ({ submissionsData, quiz }) => {
  const functions = getFunctions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [checkingIfQuizCanBeStarted, setCheckingIfQuizCanBeStarted] = React.useState(false);
  const submission = submissionsData.find(s => s.quizId === quiz.id);
  const hasSubmitted = submission?.status === QUIZ_SUBMISSION_STATUS.SUBMITTED;
  const showScore = submission?.releaseScores && hasSubmitted;
  const hasPassed = submission?.passed;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "TBD";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Modernized status logic with dark mode colors and NO BORDERS
  const getQuizStatus = () => {
    const now = new Date();
    const scheduledDate = quiz.scheduledAt.toDate();
    const endDate = quiz.endAt ? quiz.endAt.toDate() : null;

    if (now < scheduledDate) {
      return { 
        status: 'upcoming', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' 
      };
    } else if (now >= scheduledDate && (!endDate || now <= endDate)) {
      return { 
        status: 'running', 
        className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' 
      };
    } else {
      return { 
        status: 'expired', 
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
      };
    }
  };

  const quizStatus = getQuizStatus();
  const isExpired = quizStatus.status === 'expired';
  const isUpcoming = quizStatus.status === 'upcoming';
  const isRunning = quizStatus.status === 'running';

  const canStartQuiz = async (quizId: string) => {
    try {
      setCheckingIfQuizCanBeStarted(true);
      const canStartQuiz = httpsCallable(functions, "canStartQuiz");

      const result = await canStartQuiz({ quizId });
      const data = result.data as { success: boolean; message: string };

      setCheckingIfQuizCanBeStarted(false);
      return { canStart: data.success, message: data.message };

    } catch (error: any) {
      setCheckingIfQuizCanBeStarted(false);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (isRunning) return <Play className="w-3.5 h-3.5" />;
    if (isUpcoming) return <Calendar className="w-3.5 h-3.5" />;
    return <Ban className="w-3.5 h-3.5" />;
  };

  const getButtonText = () => {
    if (hasSubmitted) return "Submitted";
    if (isExpired) return "Expired";
    if (isUpcoming) return "Not Started";
    return checkingIfQuizCanBeStarted ? "Loading..." : "Start Quiz";
  };

  const isButtonDisabled = checkingIfQuizCanBeStarted || hasSubmitted || isExpired || isUpcoming;

  // Helper for card border color to indicate status subtly
  const getBorderClass = () => {
    if (isRunning) return "border-green-300 dark:border-green-500/50";
    if (isUpcoming) return "border-blue-200 dark:border-blue-500/30";
    return "border-gray-200 dark:border-slate-800";
  };

  return (
    <div
      key={quiz.id}
      className={`
        relative flex flex-col
        bg-white dark:bg-slate-900 
        rounded-2xl p-6 
        border ${getBorderClass()}
        shadow-sm hover:shadow-md dark:shadow-none
        transition-all duration-200
      `}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-accent/10 text-pink-600 dark:text-pink-400 shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-tight">
              {quiz.title}
            </h3>
            {/* Minimal Status Badge (No Border) */}
            <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide ${quizStatus.className}`}>
              {getStatusIcon()}
              <span className="capitalize">{quizStatus.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {quiz.description && (
        <p className="text-gray-600 dark:text-slate-400 text-sm mb-5 leading-relaxed line-clamp-2">
          {quiz.description}
        </p>
      )}

      {/* Data Grid - Clean & Minimal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Timer, label: "Duration", value: `${quiz.durationMinutes}m` },
          { icon: BookOpen, label: "Qs", value: quiz.questions.length },
          { icon: CheckSquare, label: "Marks", value: quiz.totalMarks },
          { icon: CheckCircle2, label: "Pass", value: `${quiz.passingPercentage}%` },
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 mb-0.5">
              <item.icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-slate-200">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Submission Status Box */}
      {hasSubmitted && (
        <div className="mb-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
           <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Submitted
              </span>
              
              {showScore && submission?.totalScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                     {submission.totalScore} / {quiz.totalMarks}
                  </span>
                  {hasPassed !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      hasPassed ? 'text-green-600 bg-green-100 dark:bg-green-500/20' : 'text-red-600 bg-red-100 dark:bg-red-500/20'
                    }`}>
                      {hasPassed ? 'PASS' : 'FAIL'}
                    </span>
                  )}
                </div>
              )}
           </div>
        </div>
      )}

      {/* Footer / Actions */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Date Info */}
        <div className="flex flex-col text-xs text-gray-500 dark:text-slate-400 gap-1 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Starts: {formatDate(quiz.scheduledAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Ends: {formatDate(quiz.endAt)}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={async () => {
            if (isExpired || isUpcoming) {
              return toast({
                title: `Quiz ${isExpired ? 'Expired' : 'Not Available'}`,
                description: isExpired
                  ? "This quiz has expired and can no longer be taken."
                  : "This quiz has not started yet.",
                variant: "destructive",
              });
            }

            const response = await canStartQuiz(quiz.id);

            if (!response?.canStart) {
              return toast({
                title: "Cannot start quiz",
                description: `${response?.message}`,
                variant: "destructive",
              });
            }

            navigate(`/quizzes/${quiz.id}`);
          }}
          disabled={isButtonDisabled}
          className={`
            w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200
            flex items-center justify-center gap-2
            ${isButtonDisabled
              ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-accent hover:text-accent-foreground hover:shadow-md'
            }
          `}
        >
          {!isButtonDisabled && !checkingIfQuizCanBeStarted && <Play className="w-3.5 h-3.5 fill-current" />}
          {getButtonText()}
        </button>
      </div>

      {/* Important Note (Only show if running and not submitted) */}
      {!hasSubmitted && isRunning && (
        <div className="absolute top-0 right-0 p-2">
            <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
        </div>
      )}
    </div>
  );
}

export default QuizCard;