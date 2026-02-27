interface ExpeditionData {
  title: string;
  region: string;
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
        end.setDate(end.getDate() + durationNum);
        setExpeditionData({ ...expeditionData, endDate: end.toISOString().split('T')[0] });
      }
    }
  };

  const handleEndDateChange = (date: string) => {
    setExpeditionData({ ...expeditionData, endDate: date });

    if (date && expeditionData.startDate) {
      const start = new Date(expeditionData.startDate);
      const end = new Date(date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  const handleStartDateChange = (date: string) => {
    setExpeditionData({ ...expeditionData, startDate: date });

    if (expectedDuration && date) {
      const start = new Date(date);
      const durationNum = parseInt(expectedDuration);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum);
        setExpeditionData({ ...expeditionData, startDate: date, endDate: end.toISOString().split('T')[0] });
      }
    } else if (expeditionData.endDate && date) {
      const start = new Date(date);
      const end = new Date(expeditionData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  return { handleStartDateChange, handleEndDateChange, handleDurationChange };
}
