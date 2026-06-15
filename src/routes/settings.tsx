import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Bell,
	Building,
	Check,
	GitBranch,
	Loader2,
	Palette,
	Save,
	Shield,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { ReleaseInfoPanel } from "../features/settings/components/ReleaseInfoPanel";
import { useAuth } from "../hooks/useAuth";
import { useRequirePageAccess } from "../hooks/usePageAccess";
import {
	getThemePreference,
	setThemePreference,
	type ThemePreference,
} from "../lib/theme";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();
	const { user, profile, loading: authLoading } = useAuth();
	useRequirePageAccess();
	const [activeTab, setActiveTab] = useState("profile");
	const [saved, setSaved] = useState(false);
	const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
		() => getThemePreference(),
	);

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	const handleSave = () => {
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const handleThemeChange = (preference: ThemePreference) => {
		setThemePreference(preference);
		setThemePreferenceState(preference);
	};

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	const tabs = [
		{ id: "profile", label: "Profile", icon: User },
		{ id: "company", label: "Company", icon: Building },
		{ id: "notifications", label: "Notifications", icon: Bell },
		{ id: "security", label: "Security", icon: Shield },
		{ id: "appearance", label: "Appearance", icon: Palette },
		{ id: "release", label: "Release", icon: GitBranch },
	];

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="mb-8">
						<h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
						<p className="text-neutral-500 mt-1">
							Manage your account and preferences
						</p>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
						{/* Tabs */}
						<div className="border-b border-neutral-100">
							<nav className="flex">
								{tabs.map((tab) => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
											activeTab === tab.id
												? "border-primary-600 text-primary-600"
												: "border-transparent text-neutral-500 hover:text-neutral-700"
										}`}
									>
										<tab.icon className="w-4 h-4" />
										{tab.label}
									</button>
								))}
							</nav>
						</div>

						{/* Content */}
						<div className="p-6">
							{activeTab === "company" && (
								<div className="space-y-6 max-w-2xl">
									<div>
										<h2 className="text-lg font-medium text-neutral-900 mb-4">
											Company Profile
										</h2>
										<p className="text-sm text-neutral-500 mb-6">
											Update your company details and logo for use in report
											headers.
										</p>
									</div>
									<div className="grid grid-cols-1 gap-6">
										<div>
											<label
												htmlFor="company-name"
												className="block text-sm font-medium text-neutral-700 mb-2"
											>
												Company Name
											</label>
											<input
												id="company-name"
												type="text"
												className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
												placeholder="Your Company Name"
											/>
										</div>
										<div>
											<label
												htmlFor="logo-url"
												className="block text-sm font-medium text-neutral-700 mb-2"
											>
												Logo URL
											</label>
											<input
												id="logo-url"
												type="text"
												className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
												placeholder="https://example.com/logo.png"
											/>
										</div>
									</div>
									<div className="pt-6 border-t border-neutral-100 flex justify-end">
										<button
											onClick={handleSave}
											type="button"
											className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
										>
											{saved ? (
												<span className="flex items-center gap-2">
													<Check className="w-4 h-4" /> Saved
												</span>
											) : (
												<span className="flex items-center gap-2">
													<Save className="w-4 h-4" /> Save Company Profile
												</span>
											)}
										</button>
									</div>
								</div>
							)}
							{activeTab === "profile" && (
								<div className="space-y-6 max-w-2xl">
									<div className="flex items-center gap-6">
										<div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
											<span className="text-primary-600 font-bold text-2xl">
												{profile?.full_name?.charAt(0) || "A"}
											</span>
										</div>
										<div>
											<button
												type="button"
												className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
											>
												Change Photo
											</button>
											<p className="text-sm text-neutral-500 mt-2">
												JPG, PNG or GIF. Max 2MB.
											</p>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-6">
										<div>
											<label
												htmlFor="settings-full-name"
												className="block text-sm font-medium text-neutral-700 mb-2"
											>
												Full Name
											</label>
											<input
												id="settings-full-name"
												type="text"
												defaultValue={profile?.full_name || ""}
												className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
											/>
										</div>
										<div>
											<label
												htmlFor="settings-username"
												className="block text-sm font-medium text-neutral-700 mb-2"
											>
												Username
											</label>
											<input
												id="settings-username"
												type="text"
												defaultValue={profile?.username || ""}
												className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="settings-email"
											className="block text-sm font-medium text-neutral-700 mb-2"
										>
											Email
										</label>
										<input
											id="settings-email"
											type="email"
											defaultValue={user?.email || ""}
											disabled
											className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
										/>
									</div>

									<div>
										<label
											htmlFor="settings-role"
											className="block text-sm font-medium text-neutral-700 mb-2"
										>
											Role
										</label>
										<input
											id="settings-role"
											type="text"
											defaultValue={profile?.roles?.name || "No Role"}
											disabled
											className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500 capitalize"
										/>
									</div>
								</div>
							)}

							{activeTab === "notifications" && (
								<div className="space-y-6 max-w-2xl">
									<div className="flex items-center justify-between py-4 border-b border-neutral-100">
										<div>
											<h3 className="font-medium text-neutral-900">
												Email Notifications
											</h3>
											<p className="text-sm text-neutral-500">
												Receive email updates about orders
											</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												defaultChecked
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
										</label>
									</div>

									<div className="flex items-center justify-between py-4 border-b border-neutral-100">
										<div>
											<h3 className="font-medium text-neutral-900">
												Order Updates
											</h3>
											<p className="text-sm text-neutral-500">
												Get notified when order status changes
											</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												defaultChecked
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
										</label>
									</div>

									<div className="flex items-center justify-between py-4">
										<div>
											<h3 className="font-medium text-neutral-900">
												Weekly Reports
											</h3>
											<p className="text-sm text-neutral-500">
												Receive weekly summary reports
											</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input type="checkbox" className="sr-only peer" />
											<div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
										</label>
									</div>
								</div>
							)}

							{activeTab === "security" && (
								<div className="space-y-6 max-w-2xl">
									<div>
										<h3 className="font-medium text-neutral-900 mb-4">
											Change Password
										</h3>
										<div className="space-y-4">
											<div>
												<label
													htmlFor="settings-current-password"
													className="block text-sm font-medium text-neutral-700 mb-2"
												>
													Current Password
												</label>
												<input
													id="settings-current-password"
													type="password"
													className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
												/>
											</div>
											<div>
												<label
													htmlFor="settings-new-password"
													className="block text-sm font-medium text-neutral-700 mb-2"
												>
													New Password
												</label>
												<input
													id="settings-new-password"
													type="password"
													className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
												/>
											</div>
											<div>
												<label
													htmlFor="settings-confirm-password"
													className="block text-sm font-medium text-neutral-700 mb-2"
												>
													Confirm New Password
												</label>
												<input
													id="settings-confirm-password"
													type="password"
													className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
												/>
											</div>
										</div>
									</div>

									<div className="pt-6 border-t border-neutral-100">
										<h3 className="font-medium text-neutral-900 mb-4">
											Two-Factor Authentication
										</h3>
										<p className="text-sm text-neutral-500 mb-4">
											Add an extra layer of security to your account
										</p>
										<button className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium">
											Enable 2FA
										</button>
									</div>
								</div>
							)}

							{activeTab === "appearance" && (
								<div className="space-y-6 max-w-2xl">
									<div>
										<h3 className="font-medium text-neutral-900 mb-4">Theme</h3>
										<div className="grid grid-cols-3 gap-4">
											<button
												onClick={() => handleThemeChange("light")}
												className={`p-4 border-2 rounded-xl text-center transition-colors ${
													themePreference === "light"
														? "border-primary-600 ring-2 ring-primary-100"
														: "border-neutral-200 hover:border-neutral-300"
												}`}
											>
												<div className="w-full h-20 bg-white rounded-lg mb-2 border"></div>
												<span className="text-sm font-medium">Light</span>
											</button>
											<button
												onClick={() => handleThemeChange("dark")}
												className={`p-4 border-2 rounded-xl text-center transition-colors ${
													themePreference === "dark"
														? "border-primary-600 ring-2 ring-primary-100"
														: "border-neutral-200 hover:border-neutral-300"
												}`}
											>
												<div className="w-full h-20 bg-neutral-900 rounded-lg mb-2"></div>
												<span className="text-sm font-medium">Dark</span>
											</button>
											<button
												onClick={() => handleThemeChange("system")}
												className={`p-4 border-2 rounded-xl text-center transition-colors ${
													themePreference === "system"
														? "border-primary-600 ring-2 ring-primary-100"
														: "border-neutral-200 hover:border-neutral-300"
												}`}
											>
												<div className="w-full h-20 bg-linear-to-b from-white to-neutral-900 rounded-lg mb-2"></div>
												<span className="text-sm font-medium">System</span>
											</button>
										</div>
									</div>
								</div>
							)}

							{activeTab === "release" && <ReleaseInfoPanel />}
						</div>

						{/* Footer */}
						<div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
							{activeTab !== "release" ? (
								<button
									onClick={handleSave}
									className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
								>
									{saved ? (
										<Check className="w-5 h-5" />
									) : (
										<Save className="w-5 h-5" />
									)}
									{saved ? "Saved!" : "Save Changes"}
								</button>
							) : (
								<span className="text-sm text-neutral-500">
									Release details are generated at build/deploy time.
								</span>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
