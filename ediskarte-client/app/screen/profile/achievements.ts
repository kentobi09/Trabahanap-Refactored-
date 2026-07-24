// Optional, if you have a separate types file

// Define the Achievement interface if you don't have it elsewhere
// You can remove this if you already have this interface defined
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// Export the achievements data as the default export
const achievements: Achievement[] = [
  {
    id: "achievement_1",
    title: "Created First Account",
    description: "Successfully created your first account",
    icon: "trophy",
    color: "#FFB347",
  },
  {
    id: "achievement_2",
    title: "Created First Job",
    description: "Successfully created your first job",
    icon: "trophy",
    color: "#FFB347",
  },
  {
    id: "achievement_5",
    title: "5 Jobs Acquired",
    description: "Completed 5 jobs successfully",
    icon: "trophy",
    color: "#5D9CEC",
  },
  {
    id: "achievement_10",
    title: "10 Jobs Acquired",
    description: "Completed 10 jobs with great success",
    icon: "trophy",
    color: "#FC6E51",
  },
  {
    id: "achievement_20",
    title: "20 Jobs Acquired",
    description: "Completed 20 jobs with exceptional service",
    icon: "trophy",
    color: "#48CFAD",
  },
  {
    id: "achievement_30",
    title: "30 Jobs Acquired",
    description: "Completed 30 jobs with consistent quality",
    icon: "trophy",
    color: "#5E97F6",
  },
  {
    id: "achievement_50",
    title: "50 Jobs Acquired",
    description: "Completed 50 jobs with outstanding performance",
    icon: "trophy",
    color: "#6DC6BE",
  },
  {
    id: "achievement_novice",
    title: "Novice",
    description: "Achieved novice status by completing your first set of jobs",
    icon: "badge",
    color: "#ED5565",
  },
  {
    id: "achievement_expert",
    title: "Expert",
    description: "Achieved expert status after completing 30 jobs",
    icon: "badge",
    color: "#AC92EC",
  },
  {
    id: "achievement_master",
    title: "Master",
    description: "Achieved master status after completing 50+ jobs",
    icon: "badge",
    color: "#FFB347",
  },
];

export default achievements;
