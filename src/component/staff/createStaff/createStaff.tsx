import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import type { Staff } from '../../../models/staff';
import { useGetQualificationsQuery } from '../../../store/api/qualificationApi';

interface CreateStaffProps {
    visible: boolean;
    onHide: () => void;
    onSave: (staff: Staff) => void;
    editData: Staff | null;
}


const CreateStaff = ({ visible, onHide, onSave, editData }: CreateStaffProps) => {

    const [designationOptions] = useState([
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Session Support Worker' },
        { id: 3, name: 'Youth Worker' },
        { id: 4, name: 'Development Officer' },
    ])
    const {data: qualificationOptions} = useGetQualificationsQuery();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const [form, setForm] = useState<Staff>(
        () => editData
            ? { name: editData.name, email: editData.email, weeklyAvailHours: editData.weeklyAvailHours, qualifications: editData.qualifications ?? [], designation: editData.designation, holidays: editData.holidays ?? [] } as Staff
            : { id: 0, name: '', email: '', weeklyAvailHours: undefined, qualifications: [], designation: undefined, holidays: [] },
    );

    const [expYears, setExpYears] = useState<number | null>(() => {
        const m = editData?.experienceMonths ?? 0;
        return m ? Math.floor(m / 12) : null;
    });
    const [expMonths, setExpMonths] = useState<number | null>(() => {
        const m = editData?.experienceMonths ?? 0;
        return m ? m % 12 : null;
    });

    const [newHolidayStart, setNewHolidayStart] = useState<Date | null>(null);
    const [newHolidayEnd, setNewHolidayEnd] = useState<Date | null>(null);
    const [deletedHolidayIds, setDeletedHolidayIds] = useState<number[]>([]);
    const [submitted, setSubmitted] = useState(false);

    const requiredLabel = (text: string) => (
        <>{text} <span style={{ color: 'red' }}>*</span></>
    );

    const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const addHoliday = () => {
        if (!newHolidayStart || !newHolidayEnd) return;
        const holiday = {
            id: 0,
            startDate: formatDate(newHolidayStart),
            endDate: formatDate(newHolidayEnd),
        };
        setForm(prev => ({ ...prev, holidays: [...(prev.holidays ?? []), holiday] }));
        setNewHolidayStart(null);
        setNewHolidayEnd(null);
    };

    const removeHoliday = (index: number) => {
        const holiday = (form.holidays ?? [])[index];
        if (holiday?.id) {
            setDeletedHolidayIds(prev => [...prev, holiday.id]);
        }
        setForm(prev => ({ ...prev, holidays: (prev.holidays ?? []).filter((_, i) => i !== index) }));
    };

    const handleChange = (field: keyof Staff, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setSubmitted(true);
        if (
            !form.name.trim() ||
            !form.email.trim() ||
            !emailRegex.test(form.email.trim()) ||
            !form.weeklyAvailHours ||
            !form.designation ||
            !form.qualifications?.length ||
            expYears === null ||
            expMonths === null
        ) return;
        const experienceMonths = ((expYears ?? 0) * 12) + (expMonths ?? 0);
        onSave({ ...editData, ...form, experienceMonths, deletedHolidayIds });
        onHide();
    };

    return (
        <Modal show={visible} onHide={onHide} centered size="lg" style={{ zIndex: 1050 }} enforceFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>{editData ? 'Edit Staff' : 'Create Staff'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 py-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <Form>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="staff-name">
                                <Form.Label className="fw-semibold">{requiredLabel('Name')}</Form.Label>
                                <InputText
                                    id="staff-name"
                                    value={form.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Enter full name"
                                    className={`w-100${submitted && !form.name.trim() ? ' p-invalid' : ''}`}
                                />
                                {submitted && !form.name.trim() && <small className="text-danger">Name is required.</small>}
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="staff-email">
                                <Form.Label className="fw-semibold">{requiredLabel('Email')}</Form.Label>
                                <InputText
                                    id="staff-email"
                                    value={form.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    placeholder="Enter email address"
                                    className={`w-100${submitted && (!form.email.trim() || !emailRegex.test(form.email.trim())) ? ' p-invalid' : ''}`}
                                    keyfilter="email"
                                />
                                {submitted && !form.email.trim() && <small className="text-danger">Email is required.</small>}
                                {submitted && form.email.trim() && !emailRegex.test(form.email.trim()) && <small className="text-danger">Enter a valid email address.</small>}
                            </Form.Group>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="staff-weekly-hours">
                                <Form.Label className="fw-semibold">{requiredLabel('Weekly Available Hours')}</Form.Label>
                                <InputNumber
                                    inputId="staff-weekly-hours"
                                    value={form.weeklyAvailHours ?? null}
                                    onValueChange={e => setForm(prev => ({ ...prev, weeklyAvailHours: e.value ?? undefined }))}
                                    placeholder="e.g. 40"
                                    min={0}
                                    max={168}
                                    suffix=" hrs"
                                    className={`w-100${submitted && !form.weeklyAvailHours ? ' p-invalid' : ''}`}
                                    inputClassName="w-100"
                                />
                                {submitted && !form.weeklyAvailHours && <small className="text-danger">Weekly hours is required.</small>}
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">{requiredLabel('Experience')}</Form.Label>
                                <div className="d-flex gap-2">
                                    <div className="flex-grow-1">
                                        <InputNumber
                                            inputId="staff-exp-years"
                                            value={expYears}
                                            onValueChange={e => setExpYears(e.value ?? null)}
                                            placeholder="Years"
                                            min={0}
                                            max={50}
                                            suffix=" yrs"
                                            className={`w-100${submitted && expYears === null ? ' p-invalid' : ''}`}
                                            inputClassName="w-100"
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <InputNumber
                                            inputId="staff-exp-months"
                                            value={expMonths}
                                            onValueChange={e => setExpMonths(e.value ?? null)}
                                            placeholder="Months"
                                            min={0}
                                            max={11}
                                            suffix=" mos"
                                            className={`w-100${submitted && expMonths === null ? ' p-invalid' : ''}`}
                                            inputClassName="w-100"
                                        />
                                    </div>
                                </div>
                                {submitted && (expYears === null || expMonths === null) && <small className="text-danger">Years and months are required.</small>}
                            </Form.Group>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="staff-designation">
                                <Form.Label className="fw-semibold">{requiredLabel('Designation')}</Form.Label>
                                <Dropdown
                                    inputId="staff-designation"
                                    value={form.designation ?? null}
                                    options={designationOptions}
                                    optionLabel="name"
                                    optionValue="name"
                                    placeholder="Select a designation"
                                    showClear
                                    className={`w-100${submitted && !form.designation ? ' p-invalid' : ''}`}
                                    filter
                                    appendTo={document.body}
                                    onChange={e => setForm(prev => ({ ...prev, designation: e.value ?? undefined }))}
                                />
                                {submitted && !form.designation && <small className="text-danger">Designation is required.</small>}
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="staff-qualifications">
                                <Form.Label className="fw-semibold">{requiredLabel('Qualifications')}</Form.Label>
                                <MultiSelect
                                    filter
                                    filterBy="name"
                                    inputId="staff-qualifications"
                                    value={form.qualifications ?? []}
                                    options={qualificationOptions}
                                    optionLabel="name"
                                    placeholder="Select qualifications"
                                    display="chip"
                                    className={`w-100${submitted && !form.qualifications?.length ? ' p-invalid' : ''}`}
                                    appendTo={document.body}
                                    onChange={e => setForm(prev => ({ ...prev, qualifications: e.value }))}
                                />
                                {submitted && !form.qualifications?.length && <small className="text-danger">At least one qualification is required.</small>}
                            </Form.Group>
                        </div>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Holidays</Form.Label>
                        <div className="d-flex gap-2 align-items-end mb-2">
                            <div className="flex-grow-1">
                                <small className="text-muted">Start Date</small>
                                <Calendar
                                    value={newHolidayStart}
                                    onChange={e => setNewHolidayStart(e.value as Date | null)}
                                    dateFormat="yy-mm-dd"
                                    placeholder="Start date"
                                    className="w-100"
                                    appendTo={document.body}
                                    showIcon
                                />
                            </div>
                            <div className="flex-grow-1">
                                <small className="text-muted">End Date</small>
                                <Calendar
                                    value={newHolidayEnd}
                                    onChange={e => setNewHolidayEnd(e.value as Date | null)}
                                    dateFormat="yy-mm-dd"
                                    placeholder="End date"
                                    className="w-100"
                                    appendTo={document.body}
                                    showIcon
                                    minDate={newHolidayStart ?? undefined}
                                />
                            </div>
                            <Button variant="outline-primary" size="sm" onClick={addHoliday} disabled={!newHolidayStart || !newHolidayEnd} style={{ whiteSpace: 'nowrap' }}>
                                + Add
                            </Button>
                        </div>
                        {(form.holidays ?? []).length > 0 && (
                            <div className="d-flex flex-column gap-1">
                                {form.holidays!.map((h, i) => (
                                    <div key={`${h.startDate}-${h.endDate}`} className="d-flex align-items-center justify-content-between border rounded px-2 py-1 bg-light">
                                        <span className="small">{h.startDate} &rarr; {h.endDate}</span>
                                        <Button variant="outline-danger" size="sm" onClick={() => removeHoliday(i)} className="py-0 px-1">
                                            &times;
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="px-4 py-3">
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="success" onClick={handleSave}>Save</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CreateStaff;
