import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, FileText, Folder, Paperclip, Send, Wrench, ExternalLink, Database, Plus, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { analysesAPI, filesAPI } from "../services/api";

const AI_AGENT_URL = import.meta.env.VITE_AI_AGENT_URL || "http://localhost:3001";

function AIWorkspace() {
	const { activeProject } = useAuth();
	const [prompt, setPrompt] = useState("");
	const [attachmentFile, setAttachmentFile] = useState(null);
	const [attachmentName, setAttachmentName] = useState("");
	const [loading, setLoading] = useState(false);
	const [projectFiles, setProjectFiles] = useState([]);
	const [selectedFileId, setSelectedFileId] = useState(null);
	const [messages, setMessages] = useState([]);
	const [activeAnalysis, setActiveAnalysis] = useState(null);
	const pollTimerRef = useRef(null);

	// Clear polling on unmount
	useEffect(() => {
		return () => {
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		};
	}, []);

	// Fetch files and existing analyses when activeProject changes
	useEffect(() => {
		async function fetchWorkspaceData() {
			if (!activeProject) return;
			try {
				const [filesRes, analysesRes] = await Promise.all([
					filesAPI.list(activeProject._id).catch(() => ({ data: [] })),
					analysesAPI.list(activeProject._id).catch(() => ({ data: [] })),
				]);

				const files = filesRes.data?.files || filesRes.data || [];
				setProjectFiles(files);
				if (files.length > 0) {
					setSelectedFileId((prev) => prev || files[0]._id);
				}

				const rawAnalyses = analysesRes.data?.analyses || analysesRes.data || [];
				const historyMessages = [];

				rawAnalyses.forEach((analysis) => {
					if (analysis.instruction) {
						historyMessages.push({
							id: `user_${analysis._id}`,
							role: "user",
							text: analysis.instruction,
							timestamp: analysis.createdAt,
						});
					}

					if (analysis.status === "COMPLETED") {
						const answerText = typeof analysis.result === "string"
							? analysis.result
							: analysis.result?.answer || analysis.result?.text || JSON.stringify(analysis.result || {});
						historyMessages.push({
							id: `ast_${analysis._id}`,
							role: "assistant",
							text: answerText,
							sources: analysis.result?.sources || [],
							agentPlan: analysis.agentPlan,
							timestamp: analysis.completedAt,
						});
					} else if (analysis.status === "FAILED") {
						historyMessages.push({
							id: `ast_${analysis._id}`,
							role: "assistant",
							isError: true,
							text: `Error: ${analysis.error?.message || "Analysis failed to process."}`,
							agentPlan: analysis.agentPlan,
							timestamp: analysis.updatedAt,
						});
					}
				});

				setMessages(historyMessages);
				if (rawAnalyses.length > 0) {
					setActiveAnalysis(rawAnalyses[rawAnalyses.length - 1]);
				}
			} catch (err) {
				console.error("[AIWorkspace] Error loading workspace data:", err.message);
			}
		}
		fetchWorkspaceData();
	}, [activeProject]);

	async function submitPrompt(event) {
		event.preventDefault();
		const userQuestion = prompt.trim();
		if (!userQuestion || loading || !activeProject) return;

		setPrompt("");
		setLoading(true);

		const userMsgId = `user_${Date.now()}`;
		const pendingAstId = `ast_pending_${Date.now()}`;

		const newUserMsg = { id: userMsgId, role: "user", text: userQuestion };
		const newPendingMsg = { id: pendingAstId, role: "assistant", loading: true };

		setMessages((prev) => [...prev, newUserMsg, newPendingMsg]);

		try {
			let targetFileId = selectedFileId;

			// If user selected a new file via Paperclip, upload it first
			if (attachmentFile) {
				const uploadRes = await filesAPI.upload(activeProject._id, attachmentFile);
				const uploadedFile = uploadRes.data || uploadRes;
				targetFileId = uploadedFile._id;
				setProjectFiles((prev) => [uploadedFile, ...prev]);
				setSelectedFileId(targetFileId);
				setAttachmentFile(null);
				setAttachmentName("");
			}

			// Fallback to first available file in project if none selected
			if (!targetFileId && projectFiles.length > 0) {
				targetFileId = projectFiles[0]._id;
			}

			if (!targetFileId) {
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === pendingAstId
							? {
									id: pendingAstId,
									role: "assistant",
									isError: true,
									text: "No document attached or available in this project. Please attach a document (using the Paperclip icon) to run analysis.",
								}
							: msg
					)
				);
				setLoading(false);
				return;
			}

			// Create analysis on backend
			const createRes = await analysesAPI.create(activeProject._id, {
				type: "DOCUMENT",
				instruction: userQuestion,
				inputFiles: [targetFileId],
			});

			const createdAnalysis = createRes.data || createRes;
			setActiveAnalysis(createdAnalysis);

			// Poll analysis until COMPLETED or FAILED
			let attempts = 0;
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);

			pollTimerRef.current = setInterval(async () => {
				attempts++;
				try {
					const statusRes = await analysesAPI.getById(activeProject._id, createdAnalysis._id);
					const updatedDoc = statusRes.data || statusRes;
					setActiveAnalysis(updatedDoc);

					if (updatedDoc.status === "COMPLETED") {
						clearInterval(pollTimerRef.current);
						pollTimerRef.current = null;
						setLoading(false);

						const answerText = typeof updatedDoc.result === "string"
							? updatedDoc.result
							: updatedDoc.result?.answer || updatedDoc.result?.text || JSON.stringify(updatedDoc.result || {});

						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === pendingAstId
									? {
											id: pendingAstId,
											role: "assistant",
											loading: false,
											text: answerText,
											sources: updatedDoc.result?.sources || [],
											agentPlan: updatedDoc.agentPlan,
										}
									: msg
							)
						);
					} else if (updatedDoc.status === "FAILED") {
						clearInterval(pollTimerRef.current);
						pollTimerRef.current = null;
						setLoading(false);

						const errMsg = updatedDoc.error?.message || "Analysis execution failed";
						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === pendingAstId
									? {
											id: pendingAstId,
											role: "assistant",
											loading: false,
											isError: true,
											text: `Error: ${errMsg}`,
											agentPlan: updatedDoc.agentPlan,
										}
									: msg
							)
						);
					} else if (attempts >= 40) {
						clearInterval(pollTimerRef.current);
						pollTimerRef.current = null;
						setLoading(false);

						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === pendingAstId
									? {
											id: pendingAstId,
											role: "assistant",
											loading: false,
											isError: true,
											text: "Request timed out waiting for backend analysis worker.",
										}
									: msg
							)
						);
					}
				} catch (pollErr) {
					console.error("[AIWorkspace] Polling error:", pollErr.message);
				}
			}, 1500);
		} catch (err) {
			console.error("[AIWorkspace] Submit prompt failed:", err.message);
			setLoading(false);
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === pendingAstId
						? {
								id: pendingAstId,
								role: "assistant",
								loading: false,
								isError: true,
								text: `Failed to initiate analysis request: ${err.message}`,
							}
						: msg
				)
			);
		}
	}

	const selectedDocName = projectFiles.find((f) => f._id === selectedFileId)?.originalName
		|| projectFiles.find((f) => f._id === selectedFileId)?.filename
		|| "Project Workspace";

	const traceSteps = activeAnalysis?.agentPlan?.stepsRun || [
		"understanding_request_parameters",
		"searching_knowledge_base",
		"reviewing_evidence",
	];

	const sourcesList = activeAnalysis?.result?.sources || [];

	return (
		<main className="workspace-page">
			<aside className="workspace-context">
				<div className="workspace-context-heading">
					<div>
						<p className="workspace-label">Current context</p>
						<strong>{selectedDocName}</strong>
					</div>
					<button
						className="workspace-new-button"
						type="button"
						aria-label="Clear chat session"
						onClick={() => {
							setPrompt("");
							setMessages([]);
							setAttachmentFile(null);
							setAttachmentName("");
						}}
					>
						<Plus size={16} />
					</button>
				</div>
				<div className="workspace-context-body">
					<section className="workspace-side-section">
						<h2><Folder size={16} /> Attached documents</h2>
						<div className="document-list">
							{projectFiles.length === 0 ? (
								<p style={{ fontSize: "12px", color: "#8f7768", padding: "8px 0" }}>No documents uploaded yet.</p>
							) : (
								projectFiles.map((doc) => {
									const docName = doc.originalName || doc.filename;
									const isSelected = doc._id === selectedFileId;
									return (
										<button
											className={`document-item${isSelected ? " selected" : ""}`}
											type="button"
											onClick={() => {
												setSelectedFileId(doc._id);
												setPrompt((current) => `${current}${current ? " " : ""}Analyze ${docName}.`);
											}}
											key={doc._id}
										>
											<FileText size={18} />
											<span>{docName}</span>
										</button>
									);
								})
							)}
						</div>
					</section>
					<section className="workspace-side-section">
						<h2><Database size={16} /> Knowledge collections</h2>
						<div className="collection-list">
							<span>Safety Protocols 2024</span>
							<span>Facility Q3</span>
						</div>
					</section>
				</div>
			</aside>

			<section className="workspace-conversation">
				<div className="chat-area">
					<p className="workspace-label">Analysis session</p>
					<h1>Analysis Session</h1>

					{messages.length === 0 && !loading && (
						<div className="assistant-message">
							<p>Welcome to the Sovara AI Analysis Enclave. Type a question below or attach a document to begin analytical query execution.</p>
						</div>
					)}

					{messages.map((msg) => {
						if (msg.role === "user") {
							return <div key={msg.id} className="user-message follow-up">{msg.text}</div>;
						}
						if (msg.loading) {
							return <ChatLoading key={msg.id} />;
						}
						if (msg.isError) {
							return (
								<div key={msg.id} className="assistant-message error-message" style={{ borderLeft: "3px solid #ef4444", backgroundColor: "rgba(239, 68, 68, 0.08)" }}>
									<p style={{ color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
										<AlertTriangle size={16} /> Backend Service Alert
									</p>
									<p style={{ fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap", marginTop: "4px" }}>{msg.text}</p>
								</div>
							);
						}
						return (
							<div key={msg.id} className="assistant-message">
								<p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
								{msg.sources && msg.sources.length > 0 && (
									<div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
										<p style={{ fontSize: "11px", fontWeight: "bold", color: "#a1a1aa", marginBottom: "4px" }}>Sources Cited:</p>
										{msg.sources.map((src, idx) => (
											<div key={idx} style={{ fontSize: "11px", color: "#d4d4d8", margin: "2px 0" }}>
												📄 {src.source} (Page {src.page}) — {src.evidence?.substring(0, 100)}...
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>

				<form className="workspace-composer" onSubmit={submitPrompt}>
					<textarea
						value={prompt}
						disabled={loading}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder={loading ? "Sovara AI is processing query against RAG pipeline..." : "Direct the analysis..."}
						rows="3"
					/>
					<div className="composer-toolbar">
						<div>
							<label className="composer-tool-button">
								<input
									type="file"
									disabled={loading}
									hidden
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (file) {
											setAttachmentFile(file);
											setAttachmentName(file.name);
										}
									}}
								/>
								<Paperclip size={15} /> {attachmentName || "Attach"}
							</label>
							<button
								type="button"
								disabled={loading}
								onClick={() => setPrompt((current) => `${current}${current ? " " : ""}Use the relevant knowledge collections.`)}
							>
								<BookOpen size={15} /> Knowledge
							</button>
							<button
								type="button"
								disabled={loading}
								onClick={() => setPrompt((current) => `${current}${current ? " " : ""}Use available analysis tools.`)}
							>
								<Wrench size={15} /> Tools
							</button>
						</div>
						<button className="send-button" disabled={loading} type="submit" aria-label="Send prompt">
							<Send size={17} />
						</button>
					</div>
				</form>
			</section>

			<aside className="workspace-trace">
				<p className="workspace-label">Trace &amp; sources</p>
				<div className="trace-list">
					{traceSteps.map((step, idx) => (
						<TraceItem
							key={step}
							text={step.replace(/_/g, " ")}
							done={!loading || idx < traceSteps.length - 1}
							active={loading && idx === traceSteps.length - 1}
						/>
					))}
				</div>
				<div className="source-list">
					{sourcesList.length === 0 ? (
						<p style={{ fontSize: "11px", color: "#8f7768", padding: "12px 0" }}>No sources loaded for this session.</p>
					) : (
						sourcesList.map((src, idx) => (
							<article className="source-card" key={idx}>
								<div className="source-label primary">
									Page {src.page} <ExternalLink size={13} />
								</div>
								<strong>{src.source}</strong>
								<span>{src.evidence ? src.evidence.substring(0, 80) + "..." : `Distance: ${src.distance}`}</span>
							</article>
						))
					)}
				</div>
			</aside>
		</main>
	);
}

function ChatLoading() {
	return (
		<div className="assistant-message chat-loading" role="status" aria-label="Sovara is generating a response">
			<div className="loading-label">
				<span className="jiggling-dots"><i /><i /><i /></span>
				<span>Sovara AI is executing agent &amp; RAG pipeline...</span>
			</div>
			<div className="skeleton-lines" aria-hidden="true">
				<i /><i /><i className="short" />
			</div>
		</div>
	);
}

function TraceItem({ text, done, active }) {
	return (
		<div className={`trace-item${active ? " active" : ""}`}>
			<span>{done ? <Check size={10} /> : <i />}</span>
			<div style={{ textTransform: "capitalize" }}>{text}</div>
		</div>
	);
}

export default AIWorkspace;

