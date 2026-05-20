const fs = require("node:fs");
let c = fs.readFileSync("HeaderDataPanel.tsx", "utf8");

// Insert after finalDestinationCountry
c = c.replace(
	`						onChange={(e) =>
							handleChange("finalDestinationCountry", e.target.value)
						}
					/>
				</div>
			</div>`,
	`						onChange={(e) =>
							handleChange("finalDestinationCountry", e.target.value)
						}
					/>
				</div>

				{/* ─── Summary Totals ─── */}
				<div className="flex gap-2">
					<div className="flex flex-col gap-1 flex-1">
						<label className="text-xs font-medium text-gray-600">Net Weight (Kg)</label>
						<input type="number" className="border rounded-md p-2 text-sm w-full" value={data.nw || ""} onChange={(e) => handleChange("nw", e.target.value)} />
					</div>
					<div className="flex flex-col gap-1 flex-1">
						<label className="text-xs font-medium text-gray-600">Gross Weight (Kg)</label>
						<input type="number" className="border rounded-md p-2 text-sm w-full" value={data.gw || ""} onChange={(e) => handleChange("gw", e.target.value)} />
					</div>
					<div className="flex flex-col gap-1 flex-1">
						<label className="text-xs font-medium text-gray-600">Volume (m³)</label>
						<input type="number" className="border rounded-md p-2 text-sm w-full" step="0.001" value={data.totalVolume || ""} onChange={(e) => handleChange("totalVolume", e.target.value)} />
					</div>
				</div>
			</div>`,
);

// Insert client fields after clientAddr1
c = c.replace(
	`					<input
						id="clientAddr1"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.address_line_1 || ""}
						onChange={(e) =>
							handleClientChange("address_line_1", e.target.value)
						}
					/>
				</div>`,
	`					<input
						id="clientAddr1"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientData?.address_line_1 || ""}
						onChange={(e) =>
							handleClientChange("address_line_1", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Address Line 2</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientData?.address_line_2 || ""} onChange={(e) => handleClientChange("address_line_2", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Address Line 3</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientData?.address_line_3 || ""} onChange={(e) => handleClientChange("address_line_3", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Post Code</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientData?.post_code || ""} onChange={(e) => handleClientChange("post_code", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Contact Person</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientData?.contact_person || ""} onChange={(e) => handleClientChange("contact_person", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Phone</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientData?.phone || ""} onChange={(e) => handleClientChange("phone", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Email</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientData?.email || ""} onChange={(e) => handleClientChange("email", e.target.value)} />
				</div>`,
);

// Insert order fields after valsemTrn
c = c.replace(
	`					<input
						id="valsemTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.ipac_valsem_trn || ""}
						onChange={(e) =>
							handleOrderChange("ipac_valsem_trn", e.target.value)
						}
					/>
				</div>
			</div>`,
	`					<input
						id="valsemTrn"
						type="text"
						className="border rounded-md p-2 text-sm w-full"
						value={clientOrderData?.ipac_valsem_trn || ""}
						onChange={(e) =>
							handleOrderChange("ipac_valsem_trn", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Delivery Note #</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={data?.deliveryNoteRef || ""} onChange={(e) => handleChange("deliveryNoteRef", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Delivery Date</label>
					<input type="date" className="border rounded-md p-2 text-sm w-full" value={data?.deliveryDate || ""} onChange={(e) => handleChange("deliveryDate", e.target.value)} />
				</div>
			</div>`,
);

// Insert shipment fields after shippingDate
c = c.replace(
	`					<input
						id="shippingDate"
						type="date"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.shipping_date || ""}
						onChange={(e) =>
							handleShipmentChange("shipping_date", e.target.value)
						}
					/>
				</div>`,
	`					<input
						id="shippingDate"
						type="date"
						className="border rounded-md p-2 text-sm w-full"
						value={clientShipmentData?.shipping_date || ""}
						onChange={(e) =>
							handleShipmentChange("shipping_date", e.target.value)
						}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Address Line 1</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.address_1 || ""} onChange={(e) => handleShipmentChange("address_1", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Address Line 2</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.address_2 || ""} onChange={(e) => handleShipmentChange("address_2", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Address Line 3</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.address_3 || ""} onChange={(e) => handleShipmentChange("address_3", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Post Code</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.post_code || ""} onChange={(e) => handleShipmentChange("post_code", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Contact Person</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.contact || ""} onChange={(e) => handleShipmentChange("contact", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Phone</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.phone || ""} onChange={(e) => handleShipmentChange("phone", e.target.value)} />
				</div>
				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-gray-600">Email</label>
					<input type="text" className="border rounded-md p-2 text-sm w-full" value={clientShipmentData?.email || ""} onChange={(e) => handleShipmentChange("email", e.target.value)} />
				</div>`,
);

fs.writeFileSync("HeaderDataPanel.tsx", c, "utf8");
console.log("Patched inputs.");
