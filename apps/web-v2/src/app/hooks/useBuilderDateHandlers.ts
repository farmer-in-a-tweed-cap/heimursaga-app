interface ExpeditionData {
  title: string;
  regions: string[];
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  visibility: 'public' | 'off-grid' | 'private';
}

export function useBuilderDateHandlers(
  expeditionData: ExpeditionData,
  setExpeditionData: React.Dispatch<React.SetStateAction<ExpeditionData>>,
  expectedDuration: string,
  setExpectedDuration: React.Dispatch<React.SetStateAction<string>>,
) {
  const handleDurationChange = (days: string) => {
    setExpectedDuration(days);

    if (days && expeditionData.startDate) {
      const start = new Date(expeditionData.startDate);
      const durationNum = parseInt(days);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum - 1); // inclusive: 1 day = same date
        setExpeditionData({ ...expeditionData, endDate: end.toISOString().split('T')[0] });
      }
    }
  };

  const handleEndDateChange = (date: string) => {
    // Don't allow end date before start date
    if (date && expeditionData.startDate && date < expeditionData.startDate) return;

    setExpeditionData({ ...expeditionData, endDate: date });

    if (date && expeditionData.startDate) {
      const start = new Date(expeditionData.startDate);
      const end = new Date(date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive: same date = 1 day
      if (diffDays >= 1) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  const handleStartDateChange = (date: string) => {
    if (expectedDuration && date) {
      const start = new Date(date);
      const durationNum = parseInt(expectedDuration);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum - 1); // inclusive: 1 day = same date
        setExpeditionData({ ...expeditionData, startDate: date, endDate: end.toISOString().split('T')[0] });
        return;
      }
    }

    // If new start date is after current end date, clear end date and duration
    if (expeditionData.endDate && date && date > expeditionData.endDate) {
      setExpeditionData({ ...expeditionData, startDate: date, endDate: '' });
      setExpectedDuration('');
      return;
    }

    setExpeditionData({ ...expeditionData, startDate: date });

    if (expeditionData.endDate && date) {
      const start = new Date(date);
      const end = new Date(expeditionData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive: same date = 1 day
      if (diffDays >= 1) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  return { handleStartDateChange, handleEndDateChange, handleDurationChange };
}
