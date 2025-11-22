import { QUIZ_SUBMISSION_STATUS } from '@/constants';
import { useToast } from '@/hooks/use-toast';
import { Quiz } from '@/types/quiz';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BookOpen, CheckSquare, Clock, Folder, Play, Calendar, Ban } from 'lucide-react';
import React from 'react'
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

  // Determine quiz status with endAt support
  const getQuizStatus = () => {
    const now = new Date();
    const scheduledDate = quiz.scheduledAt.toDate();
    const endDate = quiz.endAt ? quiz.endAt.toDate() : null;

    if (now < scheduledDate) {
      return { status: 'upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (now >= scheduledDate && (!endDate || now <= endDate)) {
      return { status: 'running', color: 'bg-green-100 text-green-800 border-green-200' };
    } else {
      return { status: 'expired', color: 'bg-gray-100 text-gray-800 border-gray-200' };
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
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (isRunning) return <Play className="w-4 h-4" />;
    if (isUpcoming) return <Calendar className="w-4 h-4" />;
    return <Ban className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (hasSubmitted) return "Already Submitted";
    if (isExpired) return "Quiz Expired";
    if (isUpcoming) return "Quiz Not Started";
    return checkingIfQuizCanBeStarted ? "Loading Quiz..." : "Start Quiz";
  };

  const isButtonDisabled = checkingIfQuizCanBeStarted || hasSubmitted || isExpired || isUpcoming;

  return (
    <div
      key={quiz.id}
      className={`bg-white rounded-xl shadow hover:shadow-lg transition p-6 border-2 ${isRunning ? 'border-green-200' : isUpcoming ? 'border-blue-200' : 'border-gray-200'
        } relative overflow-hidden`}
    >
      {/* Status Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium border ${quizStatus.color} flex items-center gap-1`}>
        {getStatusIcon()}
        <span className="capitalize">{quizStatus.status}</span>
      </div>

      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-2 pr-20">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-800">
            {quiz.title}
          </h3>
        </div>
      </div>

      {/* Schedule and End Dates */}
      <div className="space-y-1 mb-3 flex justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Starts: {formatDate(quiz.scheduledAt)}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Ends: {formatDate(quiz.endAt)}</span>
        </div>
      </div>

      {/* Submission Status */}
      {hasSubmitted && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-green-600">
            Status: Submitted
            {showScore && submission?.totalScore !== undefined
              ? ` | Score: ${submission.totalScore}/${quiz.totalMarks}`
              : ""}
            {showScore && hasPassed !== undefined
              ? ` | ${hasPassed ? "Passed ✅" : "Failed ❌"}`
              : ""}
          </div>
        </div>
      )}

      {/* Quiz Description */}
      {quiz.description && (
        <p className="text-gray-600 mb-4 text-sm line-clamp-3">
          {quiz.description}
        </p>
      )}

      {/* Quiz Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-gray-700 text-sm mb-4">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-pink-500" />
          <span>{quiz.durationMinutes} mins</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4 text-pink-500" />
          <span>{quiz.questions.length} questions</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckSquare className="w-4 h-4 text-pink-500" />
          <span>Total Marks: {quiz.totalMarks}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-600">Passing:</span>
          <span>{quiz.passingPercentage}%</span>
        </div>
      </div>

      {/* Important Note */}
      <div className="mb-4">
        <strong className="text-nowrap text-red-500 text-sm">*Note: Clicking on Start Quiz will start the timer.</strong>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
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
                title: "You cannot start this quiz right now",
                description: `${response?.message}`,
                variant: "destructive",
              });
            }

            navigate(`/quizzes/${quiz.id}`);
          }}
          disabled={isButtonDisabled}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${isButtonDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-primary hover:bg-pink-500 text-white hover:shadow-md'
            }`}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  )
}

export default QuizCard
