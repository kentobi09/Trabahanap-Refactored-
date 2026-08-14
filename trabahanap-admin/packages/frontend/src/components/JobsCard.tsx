import React, { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplet,
  Zap,
  Hammer,
  Building2,
  Paintbrush,
  Sparkles,
  Glasses,
  Snowflake,
  Settings,
  Bug,
  WrenchIcon,
  CarFront,
  Bike,
  Wind,
  Sun,
  Heart,
  User,
  Flower2,
  Stethoscope,
  PawPrint,
  Brush,
  Shirt,
  Search,
} from 'lucide-react';
import { Input } from './ui/input';

interface Service {
  name: string;
  icon: React.ReactNode;
  category: string;
  userCount: number;
}

const services: Service[] = [
  // Repair and Maintenance
  { name: "Plumbing", icon: <Droplet className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 156 },
  { name: "Electrical Repairs", icon: <Zap className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 143 },
  { name: "Carpentry", icon: <Hammer className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 98 },
  { name: "Roof Repair", icon: <Building2 className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 87 },
  { name: "Painting Services", icon: <Paintbrush className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 112 },
  { name: "Welding", icon: <Sparkles className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 76 },
  { name: "Glass Installation", icon: <Glasses className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 65 },
  { name: "Aircon Repair & Cleaning", icon: <Snowflake className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 134 },
  { name: "Appliance Repair", icon: <Settings className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 121 },
  { name: "Pest Control Services", icon: <Bug className="w-8 h-8" />, category: "Repair and Maintenance", userCount: 89 },
  
  // Vehicle Services
  { name: "Auto Mechanic", icon: <WrenchIcon className="w-8 h-8" />, category: "Vehicle Services", userCount: 167 },
  { name: "Car Wash", icon: <CarFront className="w-8 h-8" />, category: "Vehicle Services", userCount: 145 },
  { name: "Motorcycle Repair", icon: <Bike className="w-8 h-8" />, category: "Vehicle Services", userCount: 132 },
  { name: "Car Aircon Repair", icon: <Wind className="w-8 h-8" />, category: "Vehicle Services", userCount: 98 },
  { name: "Window Tinting", icon: <Sun className="w-8 h-8" />, category: "Vehicle Services", userCount: 87 },
  
  // Housekeeping Services
  { name: "Caregiver", icon: <Heart className="w-8 h-8" />, category: "Housekeeping Services", userCount: 178 },
  { name: "Personal Driver", icon: <User className="w-8 h-8" />, category: "Housekeeping Services", userCount: 156 },
  { name: "Gardening", icon: <Flower2 className="w-8 h-8" />, category: "Housekeeping Services", userCount: 143 },
  { name: "Massage Therapy", icon: <Stethoscope className="w-8 h-8" />, category: "Housekeeping Services", userCount: 134 },
  { name: "Pet Grooming & Pet Care", icon: <PawPrint className="w-8 h-8" />, category: "Housekeeping Services", userCount: 121 },
  { name: "Home Cleaning Services", icon: <Brush className="w-8 h-8" />, category: "Housekeeping Services", userCount: 167 },
  { name: "Laundry Services", icon: <Shirt className="w-8 h-8" />, category: "Housekeeping Services", userCount: 145 },
];

const JobsCard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const handleCardClick = (category: string) => {
    navigate(`/jobs/${encodeURIComponent(category)}`);
  };

  // Filter services based on search query
  const filteredGroupedServices = Object.entries(groupedServices).reduce((acc, [category, services]) => {
    const filteredServices = services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filteredServices.length > 0) {
      acc[category] = filteredServices;
    }
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-4 py-4">
        <div className="w-full max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg bg-white border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-12">
          {Object.entries(filteredGroupedServices).map(([category, categoryServices]) => (
            <div key={category} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 sticky top-0 bg-white z-10">{category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categoryServices.map((service, index) => (
                  <div
                    key={index}
                    onClick={() => handleCardClick(service.category)}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="text-blue-600 mb-4">
                        {service.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{service.name}</h3>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{service.userCount} users</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(filteredGroupedServices).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No jobs found</h3>
              <p className="text-gray-500 text-center">
                {searchQuery ? (
                  <>No jobs match your search criteria. Try adjusting your search terms.</>
                ) : (
                  <>No jobs available at the moment.</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsCard; 