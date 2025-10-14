import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location?: string;
  education?: string;
  experience?: string;
  skills?: string;
  desired_position: string;
  salary?: string;
  availability?: string;
  additional_info?: string;
  date_of_birth?: string;
  status: string;
  created_at: string;
}

interface HiringRequest {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  industry: string;
  position: string;
  requirements: string;
  urgency: string;
  job_category?: string;
  age_range?: string;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HiringRequest | null>(null);

  const { data: jobApplications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ["job-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JobApplication[];
    },
  });

  const { data: hiringRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["hiring-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HiringRequest[];
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      reviewing: "bg-yellow-500",
      contacted: "bg-purple-500",
      hired: "bg-green-500",
      rejected: "bg-red-500",
      matched: "bg-green-500",
      completed: "bg-gray-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Admin Dashboard - Coshikowa Agency</title>
      </Helmet>
      <Navbar />

      <main className="flex-1 py-12 bg-muted">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

          <Tabs defaultValue="applications" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="applications">
                Job Applications ({jobApplications.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                Hiring Requests ({hiringRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-6">
              <Card className="p-6">
                {loadingApplications ? (
                  <p className="text-center py-8">Loading applications...</p>
                ) : jobApplications.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No job applications yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              {new Date(app.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {app.full_name}
                            </TableCell>
                            <TableCell>{app.desired_position}</TableCell>
                            <TableCell>{app.email}</TableCell>
                            <TableCell>{app.phone}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(app.status)}>
                                {app.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedApplication(app)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <Card className="p-6">
                {loadingRequests ? (
                  <p className="text-center py-8">Loading requests...</p>
                ) : hiringRequests.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No hiring requests yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hiringRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>
                              {new Date(req.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {req.company_name}
                            </TableCell>
                            <TableCell>{req.position}</TableCell>
                            <TableCell>{req.contact_person}</TableCell>
                            <TableCell>{req.email}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(req.status)}>
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRequest(req)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Application Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedApplication && new Date(selectedApplication.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedApplication.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedApplication.phone}</p>
                  </div>
                  {selectedApplication.location && (
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedApplication.location}</p>
                    </div>
                  )}
                  {selectedApplication.date_of_birth && (
                    <div>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <p className="font-medium">{selectedApplication.date_of_birth}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Professional Background</h3>
                <div className="space-y-3 text-sm">
                  {selectedApplication.education && (
                    <div>
                      <span className="text-muted-foreground">Education:</span>
                      <p>{selectedApplication.education}</p>
                    </div>
                  )}
                  {selectedApplication.experience && (
                    <div>
                      <span className="text-muted-foreground">Experience:</span>
                      <p>{selectedApplication.experience}</p>
                    </div>
                  )}
                  {selectedApplication.skills && (
                    <div>
                      <span className="text-muted-foreground">Skills:</span>
                      <p>{selectedApplication.skills}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Job Preferences</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Desired Position:</span>
                    <p className="font-medium">{selectedApplication.desired_position}</p>
                  </div>
                  {selectedApplication.salary && (
                    <div>
                      <span className="text-muted-foreground">Expected Salary:</span>
                      <p className="font-medium">{selectedApplication.salary}</p>
                    </div>
                  )}
                  {selectedApplication.availability && (
                    <div>
                      <span className="text-muted-foreground">Availability:</span>
                      <p className="font-medium">{selectedApplication.availability}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedApplication.additional_info && (
                <div>
                  <h3 className="font-semibold mb-2">Additional Information</h3>
                  <p className="text-sm">{selectedApplication.additional_info}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hiring Request Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedRequest && new Date(selectedRequest.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Company Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{selectedRequest.company_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact Person:</span>
                    <p className="font-medium">{selectedRequest.contact_person}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedRequest.phone}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Position Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Position:</span>
                    <p className="font-medium">{selectedRequest.position}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Industry:</span>
                    <p className="font-medium">{selectedRequest.industry}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Urgency:</span>
                    <p className="font-medium">{selectedRequest.urgency}</p>
                  </div>
                  {selectedRequest.age_range && (
                    <div>
                      <span className="text-muted-foreground">Preferred Age Range:</span>
                      <p className="font-medium">{selectedRequest.age_range}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.requirements}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
